Computer-Based Test (CBT) SystemProject OverviewThis is a lightweight and simple Computer-Based Test (CBT) system built with Python (Flask) for the backend and HTML, CSS, and JavaScript for the frontend. It provides a secure, single-file platform for administering online tests. The system is designed to be easy to set up and use, with a dedicated admin panel for managing questions and a student interface for taking the test.FeaturesStudent Interface: A clean, timer-based interface for students to take a randomized test.Admin Panel: A protected section for adding, editing, and deleting test questions.Local Data Storage: All user and question data is stored in local JSON files (users.json and questions.json), making the setup simple and independent of a separate database.Basic Authentication: The admin panel is secured with a simple username and password.Real-time Timer: A countdown timer is displayed during the test, with automatic submission upon expiration.Score Display: Students receive their final score upon test completion.Setup and InstallationPrerequisitesPython 3.x installed on your system.pip (Python package installer).Flask and Flask-CORS libraries.Installation StepsClone or Download the Project:Download the project files to a local directory.Install Required Libraries:Open a terminal or command prompt and navigate to the project directory. Run the following command to install Flask and Flask-CORS:pip install Flask Flask-CORS
Create Data Files:The application relies on two JSON files for data. You must create these in the project directory:users.json:[
    {"regNumber": "testuser", "name": "Test User"}
]
questions.json:[
    {
        "question": "What is the capital of France?",
        "options": ["Paris", "London", "Berlin", "Madrid"],
        "correctAnswerText": "Paris"
    }
]
Run the Server:From the same terminal, execute the server.py file to start the Flask server:python server.py
Access the Application:The server will typically run on http://127.0.0.1:5000. Open your web browser and navigate to this address.UsageStudent Test: Go to the main page and enter a valid registration number to begin the test.Admin Login: Navigate to /admin to log in and manage the test questions. Use the credentials configured in server.py (by default, admin for both username and password).ContributingFeel free to improve this project by adding new features, improving the UI, or enhancing security.
