// admin.js

// --- DOM Elements ---
const questionInput = document.getElementById('question-input');
const optionsFormContainer = document.getElementById('options-form-container');
const addOptionBtn = document.getElementById('add-option-btn');
const correctAnswerInput = document.getElementById('correct-answer-input');
const saveQuestionBtn = document.getElementById('save-question-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const questionsList = document.getElementById('questions-list');
const noQuestionsMessage = document.getElementById('no-questions-message');
const logoutBtn = document.getElementById('logout-btn'); // New logout button

// Modal elements
const customModal = document.getElementById('custom-modal');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

let editingIndex = null; // Stores the index of the question being edited

/**
 * Displays a custom modal message.
 * @param {string} message The message to display in the modal.
 */
function showModal(message) {
    modalMessage.textContent = message;
    customModal.classList.remove('hidden');
    modalCloseBtn.onclick = () => customModal.classList.add('hidden');
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin.js: DOMContentLoaded. Attempting to load questions.");
    loadQuestions(); // Initial load of questions
    // Ensure default 4 option fields are present when form loads
    clearForm();
});
addOptionBtn.addEventListener('click', addOptionField);
saveQuestionBtn.addEventListener('click', handleSaveQuestion);
cancelEditBtn.addEventListener('click', cancelEdit);
logoutBtn.addEventListener('click', handleLogout); // New logout event listener

// --- Functions ---

/**
 * Handles logging out the admin user.
 */
async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        if (response.ok) {
            showModal('Logged out successfully.');
            setTimeout(() => { // Give time for modal to be seen before redirect
                window.location.href = '/'; // Redirect to main CBT index page
            }, 1500);
        } else {
            const errorData = await response.json();
            showModal(`Failed to log out: ${errorData.message || response.statusText}`);
        }
    } catch (error) {
        console.error("Logout request failed:", error);
        showModal('An error occurred during logout. Please try again.');
    }
}

/**
 * Fetches questions from the API and displays them.
 */
async function loadQuestions() {
    try {
        console.log("Admin: Fetching /api/questions...");
        const response = await fetch('/api/questions');
        if (!response.ok) {
            // If not authenticated, Flask will redirect to login, so this error might not be seen directly
            // But it's good practice to handle API errors.
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
        }
        const questions = await response.json();
        console.log("Admin: Questions loaded:", questions);
        displayQuestions(questions);
    } catch (error) {
        console.error("Admin: Error loading questions:", error);
        // Display a user-friendly message on the page itself
        questionsList.innerHTML = `<li class="feedback-message">Failed to load questions: ${error.message}. Please ensure you are logged in and the server is running. Check Termux console and browser console for details.</li>`;
        noQuestionsMessage.classList.add('hidden'); // Hide "No questions added yet." if there's an error
    }
}

/**
 * Renders the list of questions in the admin panel.
 * @param {Array} questions The array of question objects.
 */
function displayQuestions(questions) {
    questionsList.innerHTML = ''; // Clear existing list
    if (questions.length === 0) {
        noQuestionsMessage.classList.remove('hidden');
    } else {
        noQuestionsMessage.classList.add('hidden');
        questions.forEach((q, index) => {
            const li = document.createElement('li');
            li.classList.add('question-item');
            li.innerHTML = `
                <p class="question-item-text">Q${index + 1}: ${q.question}</p>
                <ul class="question-options-list">
                    ${q.options.map(opt => `
                        <li ${opt === q.correctAnswerText ? 'class="correct"' : ''}>${opt}</li>
                    `).join('')}
                </ul>
                <div class="question-actions">
                    <button class="button primary-button small-button edit-btn" data-index="${index}">Edit</button>
                    <button class="button danger-button small-button delete-btn" data-index="${index}">Delete</button>
                </div>
            `;
            questionsList.appendChild(li);
        });

        // Attach event listeners to new buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => editQuestion(parseInt(e.target.dataset.index)));
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => deleteQuestion(parseInt(e.target.dataset.index)));
        });
    }
}

/**
 * Adds a new input field for an option in the form.
 */
function addOptionField(optionText = '') {
    const div = document.createElement('div');
    div.classList.add('option-input-group');
    div.innerHTML = `
        <input type="text" class="option-input" placeholder="Option">
        <button type="button" class="remove-option-btn">X</button>
    `;
    div.querySelector('input').value = optionText;
    div.querySelector('.remove-option-btn').addEventListener('click', (e) => e.target.closest('.option-input-group').remove());
    optionsFormContainer.appendChild(div);
}

/**
 * Gathers data from the form inputs.
 * @returns {Object|null} The question object or null if validation fails.
 */
function getFormData() {
    const questionTextVal = questionInput.value.trim();
    const optionInputs = optionsFormContainer.querySelectorAll('.option-input');
    const options = Array.from(optionInputs).map(input => input.value.trim()).filter(val => val !== '');
    const correctAnswerTextVal = correctAnswerInput.value.trim();

    if (!questionTextVal || options.length < 2 || !correctAnswerTextVal) {
        showModal('Please fill in question text, at least two options, and the correct answer text.');
        return null;
    }
    if (!options.includes(correctAnswerTextVal)) {
        showModal('The correct answer text must match one of the provided options.');
        return null;
    }

    return {
        question: questionTextVal,
        options: options,
        correctAnswerText: correctAnswerTextVal
    };
}

/**
 * Handles saving a new question or updating an existing one.
 */
async function handleSaveQuestion() {
    const questionData = getFormData();
    if (!questionData) return;

    try {
        let response;
        if (editingIndex !== null) {
            // Update existing question
            console.log(`Admin: Sending PUT request for question index ${editingIndex}...`);
            response = await fetch(`/api/questions/${editingIndex}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(questionData)
            });
        } else {
            // Add new question
            console.log("Admin: Sending POST request to add new question...");
            response = await fetch('/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(questionData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${response.status} - ${errorData.error || response.statusText}`);
        }

        showModal('Question saved successfully!');
        clearForm();
        loadQuestions(); // Reload list
    }
    catch (error) {
        console.error("Admin: Error saving question:", error);
        showModal(`Failed to save question: ${error.message}. Check Termux console.`);
    }
}

/**
 * Populates the form with data of a question for editing.
 * @param {number} index The index of the question to edit.
 */
async function editQuestion(index) {
    try {
        console.log("Admin: Fetching questions for edit...");
        const response = await fetch('/api/questions');
        const questions = await response.json();
        const questionToEdit = questions[index];

        if (!questionToEdit) {
            showModal('Question not found for editing.');
            return;
        }

        editingIndex = index;
        questionInput.value = questionToEdit.question;
        optionsFormContainer.innerHTML = ''; // Clear existing options
        questionToEdit.options.forEach(opt => addOptionField(opt));
        correctAnswerInput.value = questionToEdit.correctAnswerText;

        saveQuestionBtn.textContent = 'Update Question';
        cancelEditBtn.classList.remove('hidden');
        // Ensure at least 4 option fields are always visible for consistency
        while (optionsFormContainer.querySelectorAll('.option-input-group').length < 4) {
            addOptionField();
        }
    } catch (error) {
        console.error("Admin: Error fetching question for edit:", error);
        showModal("Could not load question for editing. Check Termux console.");
    }
}

/**
 * Deletes a question from the list.
 * @param {number} index The index of the question to delete.
 */
async function deleteQuestion(index) {
    // Replace confirm() with custom modal if desired, but for quick delete, confirm is often used.
    if (!confirm('Are you sure you want to delete this question?')) {
        return;
    }
    try {
        console.log(`Admin: Sending DELETE request for question index ${index}...`);
        const response = await fetch(`/api/questions/${index}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${response.status} - ${errorData.error || response.statusText}`);
        }
        showModal('Question deleted successfully!');
        loadQuestions(); // Reload list
    } catch (error) {
        console.error("Admin: Error deleting question:", error);
        showModal(`Failed to delete question: ${error.message}. Check Termux console.`);
    }
}

/**
 * Clears the form inputs and resets to "Add Question" mode.
 */
function clearForm() {
    questionInput.value = '';
    optionsFormContainer.innerHTML = '';
    // Add default 4 option fields
    for (let i = 0; i < 4; i++) {
        addOptionField();
    }
    correctAnswerInput.value = '';
    editingIndex = null;
    saveQuestionBtn.textContent = 'Add Question';
    cancelEditBtn.classList.add('hidden');
}

/**
 * Cancels the current edit operation and clears the form.
 */
function cancelEdit() {
    clearForm();
}

