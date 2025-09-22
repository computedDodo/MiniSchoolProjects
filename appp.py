# app.py
# This Flask application serves the CBT and provides API endpoints for managing questions.

from flask import Flask, send_from_directory, request, jsonify, redirect, url_for, session
from flask_session import Session # Import Flask-Session
import json
import os
import secrets # For generating a strong secret key
import logging # Import logging module

app = Flask(__name__)

# --- Configure Logging ---
# Set up basic logging to console
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s') # Changed to DEBUG
app.logger.setLevel(logging.DEBUG) # Set Flask's logger level to DEBUG

# --- Flask Session Configuration ---
# IMPORTANT: Use a FIXED, STRONG secret key.
# This should be a long, random string. Generate once and keep it constant.
# Example: 'e4c5b6a7d8f9c0b1a2e3d4f5c6b7a8d9e0f1c2b3a4d5e6f7c8b9a0d1e2f3c4b5'
# You can generate one with: import secrets; secrets.token_hex(32)
app.config['SECRET_KEY'] = 'e4c5b6a7d8f9c0b1a2e3d4f5c6b7a8d9e0f1c2b3a4d5e6f7c8b9a0d1e2f3c4b5' # <--- REPLACE THIS!
# Make sure you actually replace the string above with a long, random, fixed string.
# DO NOT use secrets.token_hex() directly in the config if debug=True, as it can regenerate.

app.config['SESSION_TYPE'] = 'filesystem' # Store sessions on the filesystem
# Ensure SESSION_FILE_DIR is an absolute path and writable
SESSION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'flask_session_data')
app.config['SESSION_FILE_DIR'] = SESSION_DIR
app.config['SESSION_PERMANENT'] = False # Session expires when browser closes
app.config['PERMANENT_SESSION_LIFETIME'] = 3600 # Session lasts 1 hour (3600 seconds) if permanent is True

Session(app)

# --- Admin Passkey Configuration ---
ADMIN_PASSKEY = "admin123" # CHANGE THIS TO A STRONG PASSWORD!

# Define the directory where your web files are located
WEB_DIR = os.path.dirname(os.path.abspath(__file__))

# Define the path to the questions JSON file
QUESTIONS_FILE = os.path.join(WEB_DIR, 'questions.json')
# Define the path to the users JSON file
USERS_FILE = os.path.join(WEB_DIR, 'users.json')

# Ensure the session file directory exists and is writable
try:
    os.makedirs(app.config['SESSION_FILE_DIR'], exist_ok=True)
    if not os.access(app.config['SESSION_FILE_DIR'], os.W_OK):
        app.logger.error(f"Session directory is NOT writable: {app.config['SESSION_FILE_DIR']}")
    else:
        app.logger.info(f"Session directory is writable: {app.config['SESSION_FILE_DIR']}")
except OSError as e:
    app.logger.error(f"Error creating session directory {app.config['SESSION_FILE_DIR']}: {e}")

app.logger.info(f"Session data will be stored in: {app.config['SESSION_FILE_DIR']}")


# --- Helper Functions for JSON File Operations ---

def read_json_file(file_path):
    """Reads and returns data from a JSON file."""
    if not os.path.exists(file_path):
        app.logger.warning(f"File not found: {file_path}. Creating an empty one.")
        with open(file_path, 'w', encoding='utf-8') as f:
            if file_path == QUESTIONS_FILE:
                json.dump([], f, indent=2) # Questions start as an empty list
            elif file_path == USERS_FILE:
                json.dump({}, f, indent=2) # Users start as an empty object
        return [] if file_path == QUESTIONS_FILE else {}

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip() # Read content and strip whitespace
            if not content: # If file is empty after stripping
                app.logger.warning(f"File {file_path} is empty. Returning empty data.")
                return [] if file_path == QUESTIONS_FILE else {}
            data = json.loads(content) # Load JSON from content
            app.logger.info(f"Successfully read data from {file_path}")
            return data
    except json.JSONDecodeError as e:
        app.logger.error(f"JSONDecodeError in {file_path}: {e}. File content might be invalid. Returning empty data.")
        # Attempt to fix by writing empty JSON if it's completely unreadable
        if file_path == QUESTIONS_FILE:
            write_json_file(QUESTIONS_FILE, [])
            return []
        elif file_path == USERS_FILE:
            write_json_file(USERS_FILE, {})
            return {}
        return [] if file_path == QUESTIONS_FILE else {} # Fallback
    except Exception as e:
        app.logger.error(f"An error occurred reading {file_path}: {e}. Returning empty data.")
        return [] if file_path == QUESTIONS_FILE else {}

def write_json_file(file_path, data):
    """Writes data to a JSON file."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        app.logger.info(f"Successfully wrote data to {file_path}")
        return True
    except Exception as e:
        app.logger.error(f"An error occurred writing to {file_path}: {e}")
        return False

# --- Authentication Logic (before_request) ---
@app.before_request
def check_authentication():
    """
    Checks if the current request requires authentication and redirects/denies if not logged in.
    This function runs before every request.
    """
    path = request.path
    method = request.method

    app.logger.debug(f"Request received: {method} {path}")
    
    logged_in_status = None
    try:
        logged_in_status = session.get('logged_in')
    except Exception as e:
        app.logger.error(f"Error accessing session: {e}")
        # If session cannot be accessed, assume not logged in for safety
        logged_in_status = False

    app.logger.debug(f"Current session logged_in status: {logged_in_status}")

    # List of paths that are always publicly accessible (no session check)
    public_paths_and_api_gets = [
        '/', '/index.html', '/style.css', '/script.js', # Main CBT app files
        '/admin_login', '/admin_login.js', # Admin login page and its script
        '/api/login', # Login API endpoint (POST)
        '/api/logout', # Logout API endpoint (POST)
        '/api/users', # Users API (GET)
        '/api/questions' # Questions API (GET)
    ]

    # Check if the current path is in the public list
    # For API endpoints, also check the method
    if path in public_paths_and_api_gets:
        if path.startswith('/api/'):
            # For API paths in public_paths_and_api_gets, only GET and POST for login/logout are public
            if method == 'GET' or (method == 'POST' and (path == '/api/login' or path == '/api/logout')):
                app.logger.debug(f"Allowed public API access to: {path} ({method})")
                return None
            else: # If it's a POST/PUT/DELETE to /api/questions, it's NOT public here
                app.logger.debug(f"API path {path} ({method}) is not public, falling through to protected check.")
                pass # Fall through to protected check
        else: # It's a static file or root path, always public
            app.logger.debug(f"Allowed public access to static file/root: {path}")
            return None

    # If the path is not explicitly public, it requires authentication
    if not logged_in_status: # Use the safely retrieved status
        app.logger.warning(f"Unauthorized access attempt to: {path} ({method}). Redirecting to login.")
        # If it's an API request, send 401. If it's a page request, redirect.
        if path.startswith('/api/'):
            return jsonify({"error": "Unauthorized"}), 401
        return redirect(url_for('serve_admin_login'))

    # If we reach here, the user is logged in and accessing a protected resource
    app.logger.debug(f"Authorized access to: {path} ({method})")
    return None


# --- Routes for Serving Static Files ---

@app.route('/')
def serve_index():
    """Serves the main CBT application HTML."""
    return send_from_directory(WEB_DIR, 'index.html')

@app.route('/admin_login')
def serve_admin_login():
    """Serves the admin login page HTML."""
    return send_from_directory(WEB_DIR, 'admin_login.html')

@app.route('/admin')
def serve_admin():
    """Serves the admin interface HTML (protected)."""
    return send_from_directory(WEB_DIR, 'admin.html')

@app.route('/<path:path>')
def serve_static_files(path):
    """Serves other static files (CSS, JS, JSON)."""
    # This route is caught by the before_request decorator, so it's protected
    # unless explicitly allowed by check_authentication.
    return send_from_directory(WEB_DIR, path)

# --- API Endpoints for Authentication ---

@app.route('/api/login', methods=['POST'])
def login():
    """Handles admin login."""
    data = request.json
    passkey = data.get('passkey')
    app.logger.info(f"Login attempt with passkey: {'*' * len(passkey) if passkey else 'None'}")

    if passkey == ADMIN_PASSKEY:
        session['logged_in'] = True
        app.logger.info("Login successful. Session set.")
        app.logger.debug(f"Session state after successful login: {session}") # Log session content
        return jsonify({"message": "Login successful"}), 200
    else:
        app.logger.warning("Invalid passkey provided.")
        return jsonify({"message": "Invalid passkey"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    """Handles admin logout."""
    app.logger.info("Attempting logout. Current session state: %s", session.get('logged_in'))
    session.pop('logged_in', None)
    app.logger.info("Logged out successfully. Session cleared.")
    app.logger.debug(f"Session state after logout: {session}") # Log session content
    return jsonify({"message": "Logged out successfully"}), 200


# --- API Endpoints for Questions (Protected for modification, public for GET) ---

@app.route('/api/questions', methods=['GET'])
def get_questions():
    """Returns all questions from questions.json."""
    questions_data = read_json_file(QUESTIONS_FILE)
    return jsonify(questions_data)

@app.route('/api/questions', methods=['POST'])
def add_question():
    """Adds a new question to questions.json."""
    new_question = request.json
    if not new_question or not all(k in new_question for k in ['question', 'options', 'correctAnswerText']):
        app.logger.error(f"Invalid question data for POST: {new_question}")
        return jsonify({"error": "Invalid question data"}), 400

    questions_data = read_json_file(QUESTIONS_FILE)
    questions_data.append(new_question)
    if write_json_file(QUESTIONS_FILE, questions_data):
        app.logger.info("Question added successfully.")
        return jsonify({"message": "Question added successfully", "question": new_question}), 201
    app.logger.error("Failed to save question during POST operation.")
    return jsonify({"error": "Failed to save question"}), 500

@app.route('/api/questions/<int:index>', methods=['PUT'])
def update_question(index):
    """Updates an existing question in questions.json by index."""
    updated_question = request.json
    questions_data = read_json_file(QUESTIONS_FILE)

    if not (0 <= index < len(questions_data)):
        app.logger.error(f"Question index {index} out of bounds for PUT operation.")
        return jsonify({"error": "Question index out of bounds"}), 404
    if not updated_question or not all(k in updated_question for k in ['question', 'options', 'correctAnswerText']):
        app.logger.error(f"Invalid question data for PUT at index {index}: {updated_question}")
        return jsonify({"error": "Invalid question data"}), 400

    questions_data[index] = updated_question
    if write_json_file(QUESTIONS_FILE, questions_data):
        app.logger.info(f"Question at index {index} updated successfully.")
        return jsonify({"message": "Question updated successfully", "question": updated_question}), 200
    app.logger.error(f"Failed to update question at index {index} during PUT operation.")
    return jsonify({"error": "Failed to update question"}), 500

@app.route('/api/questions/<int:index>', methods=['DELETE'])
def delete_question(index):
    """Deletes a question from questions.json by index."""
    questions_data = read_json_file(QUESTIONS_FILE)

    if not (0 <= index < len(questions_data)):
        app.logger.error(f"Question index {index} out of bounds for DELETE operation.")
        return jsonify({"error": "Question index out of bounds"}), 404

    deleted_question = questions_data.pop(index)
    if write_json_file(QUESTIONS_FILE, questions_data):
        app.logger.info(f"Question at index {index} deleted successfully.")
        return jsonify({"message": "Question deleted successfully", "question": deleted_question}), 200
    app.logger.error(f"Failed to delete question at index {index} during DELETE operation.")
    return jsonify({"error": "Failed to delete question"}), 500

# --- API Endpoints for Users (Read-Only) ---

@app.route('/api/users', methods=['GET'])
def get_users():
    """Returns all registered users from users.json."""
    users_data = read_json_file(USERS_FILE)
    return jsonify(users_data)


# --- Run the Flask App ---
if __name__ == '__main__':
    # Ensure questions.json and users.json exist initially
    read_json_file(QUESTIONS_FILE)
    read_json_file(USERS_FILE)
    # Run Flask app on all available interfaces (0.0.0.0) and port 8000
    app.run(host='0.0.0.0', port=8009, debug=True)

