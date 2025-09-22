// script.js

// --- Data Structures ---
const originalQuestions = [ // Renamed to originalQuestions
    {
        question: "What does CPU stand for?",
        options: ["Central Processing Unit", "Control Panel Unit", "Computer Personal Unit", "Central Power Unit"],
        correctAnswer: "A"
    },
    {
        question: "Which of these is an input device?",
        options: ["Printer", "Monitor", "Keyboard", "Speaker"],
        correctAnswer: "C"
    },
    {
        question: "What is the main function of RAM?",
        options: ["Long-term storage", "Temporary data storage", "Processing calculations", "Managing network connections"],
        correctAnswer: "B"
    },
    {
        question: "Which programming language is often used for web development? (e.g., for front-end)",
        options: ["C++", "Java", "Python", "HTML"],
        correctAnswer: "D"
    },
    {
        question: "What does HTTP stand for?",
        options: ["HyperText Transfer Protocol", "High-Tech Test Program", "Home Tool Transfer Point", "Hyper Transfer Text Protocol"],
        correctAnswer: "A"
    },
    {
        question: "What is a byte composed of?",
        options: ["1 bit", "4 bits", "8 bits", "16 bits"],
        correctAnswer: "C"
    },
    {
        question: "Which of these is an operating system?",
        options: ["Microsoft Word", "Google Chrome", "Linux", "Adobe Photoshop"],
        correctAnswer: "C"
    },
    {
        question: "What is an algorithm?",
        options: ["A type of computer virus", "A set of instructions to solve a problem", "A hardware component", "A network protocol"],
        correctAnswer: "B"
    },
    {
        question: "What does 'GUI' stand for?",
        options: ["General User Interface", "Graphical User Interface", "Global Utility Index", "Graphics Unit Integration"],
        correctAnswer: "B"
    },
    {
        question: "Which company developed the Python programming language?",
        options: ["Microsoft", "Google", "Apple", "Guido van Rossum"],
        correctAnswer: "D"
    }
];

let registeredUsers = {}; // To store user data from users.json
let shuffledQuestions = []; // This array will hold the questions in a random order for each test
let userAnswers = []; // Stores 'A', 'B', 'C', 'D' for each question, corresponding to shuffledQuestions
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

// --- Utility Functions ---

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
 * Initializes the application by loading user data and setting up event listeners.
 */
async function initApp() {
    try {
        const response = await fetch('users.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        registeredUsers = await response.json();
        console.log("Registered users loaded:", registeredUsers);
    } catch (error) {
        console.error("Could not load registered users:", error);
        regFeedback.textContent = "Error loading user data. Please check server setup.";
        validateRegBtn.disabled = true; // Disable button if data fails to load
    }

    // Set total question count display (based on original questions count)
    totalQNum.textContent = originalQuestions.length;

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
    if (key === 'A' || key === 'B' || key === 'C' || key === 'D') {
        handleAnswerSelection(key);
    } else if (key === 'N') {
        navigateQuestions(1);
    } else if (key === 'P') {
        navigateQuestions(-1);
    } else if (key === 'Y') {
        submitTest();
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
    // Shuffle questions for this test session
    shuffledQuestions = shuffleArray([...originalQuestions]); // Create a shallow copy before shuffling
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
            // Using alert for simplicity as per original batch script, but a custom modal would be better in a real web app.
            // Note: alert() is blocking, which might affect timer display slightly before it pops up.
            alert("Time's up! Your test will be submitted automatically.");
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

    const optionLetters = ['A', 'B', 'C', 'D'];
    question.options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.classList.add('option-button');
        optionBtn.textContent = `${optionLetters[index]}. ${option}`;
        optionBtn.dataset.option = optionLetters[index]; // Store the option letter

        // Highlight if this option was previously selected by the user for the current shuffled question
        if (userAnswers[currentQuestionIndex] === optionLetters[index]) {
            optionBtn.classList.add('selected');
        }

        optionBtn.addEventListener('click', () => handleAnswerSelection(optionLetters[index]));
        optionsContainer.appendChild(optionBtn);
    });

    // Disable/enable navigation buttons
    prevQBtn.disabled = currentQuestionIndex === 0;
    nextQBtn.disabled = currentQuestionIndex === shuffledQuestions.length - 1; // Use shuffledQuestions.length
}

/**
 * Handles the user's answer selection for the current question.
 * @param {string} selectedOption The letter of the selected option (A, B, C, D).
 */
function handleAnswerSelection(selectedOption) {
    userAnswers[currentQuestionIndex] = selectedOption;
    // Update UI to reflect selection
    const optionButtons = optionsContainer.querySelectorAll('.option-button');
    optionButtons.forEach(btn => {
        if (btn.dataset.option === selectedOption) {
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
        if (userAnswers[i] === shuffledQuestions[i].correctAnswer) {
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

