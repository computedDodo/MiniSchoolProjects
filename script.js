// script.js

// --- Data Structures (now fetched from API) ---
let questions = []; // This will be populated from the API
let registeredUsers = {}; // To store user data from users.json

let shuffledQuestions = []; // This array will hold the questions in a random order for each test
let userAnswers = []; // Stores the *text* of the selected option for each question
let currentQuestionIndex = 0;
let timerInterval;
const TIME_LIMIT_SECONDS = 600; // 10 minutes
let timeLeft = TIME_LIMIT_SECONDS;
let userName = '';
let regNumber = '';

// --- DOM Elements ---
const welcomeSection = document.getElementById('welcome-section');
const startTestSection = document.getElementById('start-test-section');
const testSection = document.getElementById('test-section');
const resultsSection = document.getElementById('results-section');

const regNumberInput = document.getElementById('reg-number-input');
const regFeedback = document.getElementById('reg-feedback');
const validateRegBtn = document.getElementById('validate-reg-btn');

const userNameDisplay = document.getElementById('user-name-display');
const regNumberDisplay = document.getElementById('reg-number-display');
const startTestBtn = document.getElementById('start-test-btn');

const currentQNum = document.getElementById('current-q-num');
const totalQNum = document.getElementById('total-q-num');
const timerDisplay = document.getElementById('timer-display');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const prevQBtn = document.getElementById('prev-q-btn');
const nextQBtn = document.getElementById('next-q-btn');
const submitTestBtn = document.getElementById('submit-test-btn');

const resultsUserName = document.getElementById('results-user-name');
const resultsRegNumber = document.getElementById('results-reg-number');
const finalScore = document.getElementById('final-score');

// Modal elements
const customModal = document.getElementById('custom-modal');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

// --- Utility Functions ---

/**
 * Displays a custom modal message.
 * @param {string} message The message to display in the modal.
 */
function showModal(message) {
    modalMessage.textContent = message;
    customModal.classList.remove('hidden');
    modalCloseBtn.onclick = () => customModal.classList.add('hidden');
}


/**
 * Shuffles an array in place using the Fisher-Yates (Knuth) algorithm.
 * @param {Array} array The array to shuffle.
 * @returns {Array} The shuffled array.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// --- Main Functions ---

/**
 * Initializes the application by loading user data and questions from API, and setting up event listeners.
 */
async function initApp() {
    try {
        // Fetch registered users
        console.log("Fetching /api/users...");
        const usersResponse = await fetch('/api/users');
        if (!usersResponse.ok) {
            throw new Error(`HTTP error! status: ${usersResponse.status} for users`);
        }
        registeredUsers = await usersResponse.json();
        console.log("Registered users loaded:", registeredUsers);

        // Fetch questions
        console.log("Fetching /api/questions...");
        const questionsResponse = await fetch('/api/questions');
        if (!questionsResponse.ok) {
            throw new Error(`HTTP error! status: ${questionsResponse.status} for questions`);
        }
        questions = await questionsResponse.json();
        console.log("Questions loaded:", questions);

        if (questions.length === 0) {
            regFeedback.textContent = "No questions available. Please add questions via the Admin Panel.";
            validateRegBtn.disabled = true;
        }

    } catch (error) {
        console.error("Could not load initial data:", error);
        regFeedback.textContent = "Error loading initial data. Please ensure the server is running and data files exist. Check Termux console for details.";
        validateRegBtn.disabled = true; // Disable button if data fails to load
    }

    // Set total question count display (based on loaded questions count)
    totalQNum.textContent = questions.length;

    // Event Listeners
    validateRegBtn.addEventListener('click', validateRegistration);
    regNumberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            validateRegistration();
        }
    });

    startTestBtn.addEventListener('click', startTest);

    nextQBtn.addEventListener('click', () => navigateQuestions(1));
    prevQBtn.addEventListener('click', () => navigateQuestions(-1));
    submitTestBtn.addEventListener('click', submitTest);

    // Keyboard navigation for test section
    document.addEventListener('keydown', handleKeyboardInput);
}

/**
 * Handles keyboard input for test navigation and answer selection.
 * Only active when testSection is visible.
 * @param {KeyboardEvent} event The keyboard event.
 */
function handleKeyboardInput(event) {
    if (testSection.classList.contains('hidden')) {
        return; // Only process input if test section is active
    }

    const key = event.key.toUpperCase();
    // For keyboard input, we need to map A,B,C,D to the *currently displayed* option text
    if (key === 'A' || key === 'B' || key === 'C' || key === 'D') {
        const optionButtons = optionsContainer.querySelectorAll('.option-button');
        let selectedOptionText = null;
        if (key === 'A' && optionButtons[0]) selectedOptionText = optionButtons[0].dataset.optionText;
        if (key === 'B' && optionButtons[1]) selectedOptionText = optionButtons[1].dataset.optionText;
        if (key === 'C' && optionButtons[2]) selectedOptionText = optionButtons[2].dataset.optionText;
        if (key === 'D' && optionButtons[3]) selectedOptionText = optionButtons[3].dataset.optionText;

        if (selectedOptionText) {
            handleAnswerSelection(selectedOptionText);
        }
    } else if (key === 'N') {
        navigateQuestions(1);
    } else if (key === 'P') {
        navigateQuestions(-1);
    } else if (key === 'Y') {
        showModal("Are you sure you want to submit the test?", () => submitTest()); // Use modal for confirmation
    } else {
        // Optionally provide feedback for invalid keys, but not required by prompt
        // console.log("Invalid key pressed:", key);
    }
}

/**
 * Validates the entered registration number against the loaded user data.
 */
function validateRegistration() {
    const inputReg = regNumberInput.value.trim();
    if (inputReg === '') {
        regFeedback.textContent = "Registration number cannot be empty.";
        return;
    }

    if (registeredUsers.hasOwnProperty(inputReg)) {
        userName = registeredUsers[inputReg];
        regNumber = inputReg;
        regFeedback.textContent = ''; // Clear any previous feedback
        welcomeSection.classList.add('hidden');
        startTestSection.classList.remove('hidden');
        userNameDisplay.textContent = userName;
        regNumberDisplay.textContent = regNumber;
    } else {
        regFeedback.textContent = `Registration number '${inputReg}' not found. Please recheck.`;
    }
}

/**
 * Starts the test, initializes the timer, shuffles questions, and displays the first question.
 */
function startTest() {
    if (questions.length === 0) {
        showModal("No questions available to start the test. Please add questions via the Admin Panel.");
        return;
    }

    // Shuffle questions for this test session
    shuffledQuestions = shuffleArray([...questions]); // Create a shallow copy before shuffling
    userAnswers = Array(shuffledQuestions.length).fill(null); // Reset user answers for new shuffled order
    currentQuestionIndex = 0; // Reset question index

    startTestSection.classList.add('hidden');
    testSection.classList.remove('hidden');
    startTimer();
    displayQuestion();
}

/**
 * Starts the countdown timer for the test.
 */
function startTimer() {
    timeLeft = TIME_LIMIT_SECONDS; // Reset timer for new test
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showModal("Time's up! Your test will be submitted automatically.");
            submitTest();
        }
    }, 1000);
}

/**
 * Displays the current question and its options.
 */
function displayQuestion() {
    const question = shuffledQuestions[currentQuestionIndex]; // Use shuffledQuestions
    currentQNum.textContent = currentQuestionIndex + 1;
    questionText.textContent = `${currentQuestionIndex + 1}. ${question.question}`;
    optionsContainer.innerHTML = ''; // Clear previous options

    // Create a copy of options and shuffle them for the current question
    const shuffledOptionsForThisQuestion = shuffleArray([...question.options]);

    const optionLetters = ['A', 'B', 'C', 'D']; // These are just for display labels
    shuffledOptionsForThisQuestion.forEach((optionText, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.classList.add('option-button');
        optionBtn.textContent = `${optionLetters[index]}. ${optionText}`;
        optionBtn.dataset.optionText = optionText; // Store the actual option text in a data attribute

        // Highlight if this option was previously selected by the user for the current shuffled question
        if (userAnswers[currentQuestionIndex] === optionText) {
            optionBtn.classList.add('selected');
        }

        // When clicked, pass the actual option text
        optionBtn.addEventListener('click', () => handleAnswerSelection(optionText));
        optionsContainer.appendChild(optionBtn);
    });

    // Disable/enable navigation buttons
    prevQBtn.disabled = currentQuestionIndex === 0;
    nextQBtn.disabled = currentQuestionIndex === shuffledQuestions.length - 1; // Use shuffledQuestions.length
}

/**
 * Handles the user's answer selection for the current question.
 * @param {string} selectedOptionText The actual text of the selected option.
 */
function handleAnswerSelection(selectedOptionText) {
    userAnswers[currentQuestionIndex] = selectedOptionText; // Store the actual text
    // Update UI to reflect selection
    const optionButtons = optionsContainer.querySelectorAll('.option-button');
    optionButtons.forEach(btn => {
        if (btn.dataset.optionText === selectedOptionText) { // Compare with data-option-text
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

/**
 * Navigates to the next or previous question.
 * @param {number} direction - 1 for next, -1 for previous.
 */
function navigateQuestions(direction) {
    currentQuestionIndex += direction;
    displayQuestion();
}

/**
 * Calculates the score and displays the results.
 */
function submitTest() {
    clearInterval(timerInterval); // Stop the timer
    let score = 0;
    for (let i = 0; i < shuffledQuestions.length; i++) { // Iterate through shuffled questions
        // Compare the stored answer text with the correct answer text for this shuffled question
        if (userAnswers[i] === shuffledQuestions[i].correctAnswerText) {
            score++;
        }
    }

    testSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    resultsUserName.textContent = userName;
    resultsRegNumber.textContent = regNumber;
    finalScore.textContent = `${score}/${shuffledQuestions.length}`; // Use shuffledQuestions.length

    // Log to console as a simulation of saving
    console.log(`Test Result - User: ${userName} (${regNumber}), Score: ${score}/${shuffledQuestions.length}, Time Left: ${timeLeft}s`);
    console.warn("Note: Actual server-side saving of results is NOT possible with Python's http.server.");
    console.warn("To save results persistently, you would need a backend framework (e.g., Flask, Node.js) that can handle POST requests and write to files/databases.");
}

// --- Initialize the app when the DOM is fully loaded ---
document.addEventListener('DOMContentLoaded', initApp);

