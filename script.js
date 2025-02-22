// script.js
// Firebase configuration (REPLACE WITH YOUR OWN CONFIG)
//const firebaseConfig = { /* ... */ };
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA0Gi96O7DUzO9s1fbvc476BJq9pZ2DzXI",
  authDomain: "tournamanage.firebaseapp.com",
  projectId: "tournamanage",
  storageBucket: "tournamanage.firebasestorage.app",
  messagingSenderId: "423341351838",
  appId: "1:423341351838:web:cf256d5b3f01ffdc65ec8f",
  measurementId: "G-Q005K3PGV5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ... (Rest of JavaScript code - see next response)
// ... (Previous code from HTML file)

const homepage = document.getElementById('homepage');
const tournamentSetupPage = document.getElementById('tournamentSetupPage');
const matchSchedulePage = document.getElementById('matchSchedulePage');
const pointsTablePage = document.getElementById('pointsTablePage');

const loginButton = document.getElementById('loginButton');
const authStatus = document.getElementById('authStatus');
const content = document.getElementById('content');
const logoutButton = document.getElementById('logoutButton');
const selectSportButton = document.getElementById('selectSport');
const tournamentSetupButton = document.getElementById('tournamentSetup');
const matchScheduleButton = document.getElementById('matchSchedule');
const pointsTableButton = document.getElementById('pointsTable');

const tournamentNameInput = document.getElementById('tournamentName');
const teamsContainer = document.getElementById('teamsContainer');
const addTeamButton = document.getElementById('addTeam');
const goToMatchScheduleButton = document.getElementById('goToMatchSchedule');
const backToHomeFromSetupButton = document.getElementById('backToHomeFromSetup');

const matchScheduleTable = document.getElementById('matchScheduleTable');
const goToPointsTableFromScheduleButton = document.getElementById('goToPointsTableFromSchedule');
const backToHomeFromScheduleButton = document.getElementById('backToHomeFromSchedule');

const tournamentSelect = document.getElementById('tournamentSelect');
const pointsTable = document.getElementById('pointsTable');
const backToHomeFromPointsButton = document.getElementById('backToHomeFromPoints');



let teams = [];
let matches = [];

// Authentication
auth.onAuthStateChanged(user => {
    if (user) {
        authStatus.textContent = `Welcome, ${user.displayName}!`;
        content.style.display = 'block';
        loginButton.style.display = 'none';
    } else {
        authStatus.textContent = 'Please login.';
        content.style.display = 'none';
        loginButton.style.display = 'block';
    }
});

loginButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        authStatus.textContent = `Login Error: ${error.message}`;
    });
});

logoutButton.addEventListener('click', () => {
    auth.signOut();
});

// Page Navigation
selectSportButton.addEventListener('click', () => {
    // Implement sport selection logic if needed
});

tournamentSetupButton.addEventListener('click', () => {
    showPage(tournamentSetupPage);
});

matchScheduleButton.addEventListener('click', () => {
    showPage(matchSchedulePage);
    generateMatchSchedule();
});

pointsTableButton.addEventListener('click', () => {
    showPage(pointsTablePage);
    populateTournamentSelect();
});

backToHomeFromSetupButton.addEventListener('click', () => showPage(homepage));
backToHomeFromScheduleButton.addEventListener('click', () => showPage(homepage));
backToHomeFromPointsButton.addEventListener('click', () => showPage(homepage));

goToMatchScheduleButton.addEventListener('click', () => {
    // Save tournament data to Firestore
    saveTournamentData().then(() => {
        showPage(matchSchedulePage);
        generateMatchSchedule();
    });
});

goToPointsTableFromScheduleButton.addEventListener('click', () => {
    showPage(pointsTablePage);
    populateTournamentSelect();
});

// Tournament Setup
addTeamButton.addEventListener('click', () => {
    const teamName = prompt("Enter team name:");
    if (teamName) {
        const player1 = prompt(`Enter player 1 name for ${teamName}:`);
        const player2 = prompt(`Enter player 2 name for ${teamName}:`);
        if (player1 && player2) {
            teams.push({ name: teamName, player1, player2 });
            renderTeams();
        } else {
            alert("Please enter both player names.");
        }
    }
});

function renderTeams() {
    teamsContainer.innerHTML = '';
    teams.forEach(team => {
        const teamDiv = document.createElement('div');
        teamDiv.textContent = `${team.name} (${team.player1}, ${team.player2})`;
        teamsContainer.appendChild(teamDiv);
    });
}


// Match Schedule Generation
function generateMatchSchedule() {
    matchScheduleTable.querySelector('tbody').innerHTML = ''; // Clear existing rows
    matches = []; // Clear existing matches
    if (teams.length > 1) {

        for (let i = 0; i < Math.min(100, (teams.length * (teams.length - 1)) / 2); i++){
            matches.push({
                matchNumber: i + 1,
                team1: null,
                player1Team1: null,
                player2Team1: null,
                team2: null,
                player1Team2: null,
                player2Team2: null,
                date: null,
                score: null
            });
        }

        let k = 0;
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                if(k < matches.length){
                matches[k].team1 = teams[i].name;
                matches[k].player1Team1 = teams[i].player1;
                matches[k].player2Team1 = teams[i].player2;
                matches[k].team2 = teams[j].name;
                matches[k].player1Team2 = teams[j].player1;
                matches[k].player2Team2 = teams[j].player2;
                k++;
            }
            }
        }


        matches.forEach(match => {
            const row = matchScheduleTable.querySelector('tbody').insertRow();
            Object.values(match).forEach(value => {
                const cell = row.insertCell();
                cell.contentEditable = true;
                cell.textContent = value || ""; // Display null as empty
            });
        });
    }
}


// Points Table
function populateTournamentSelect() {
    tournamentSelect.innerHTML = ''; // Clear existing options
    // Fetch tournament names from Firestore and add them to the select element
    db.collection('tournaments').get().then(snapshot => {
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.text = doc.data().name;
            tournamentSelect.appendChild(option);
        });
    });
}

tournamentSelect.addEventListener('change', () => {
    const selectedTournamentId = tournamentSelect.value;
    if (selectedTournamentId) {
        // Fetch points data from Firestore and update the points table
        db.collection('tournaments').doc(selectedTournamentId).collection('points').get().then(snapshot => {
            pointsTable.querySelector('tbody').innerHTML = ''; // Clear existing rows
            snapshot.forEach(doc => {
                const row = pointsTable.querySelector('tbody').insertRow();
                const teamCell = row.insertCell();
                const pointsCell = row.insertCell();
                teamCell.textContent = doc.id; // Team name is the document ID
                pointsCell.textContent = doc.data().points;
            });
        });
    }
});

// Firestore interaction (Tournament Data)
async function saveTournamentData() {
    const tournamentName = tournamentNameInput.value;
    const tournamentRef = db.collection('tournaments').doc(); // Auto-generated ID
    await tournamentRef.set({ name: tournamentName });

    // Store teams within the tournament document
    const teamsCollection = tournamentRef.collection('teams');
    for (const team of teams) {
        await teamsCollection.doc(team.name).set(team); // Team name as document ID
    }

    // Initialize points table (you might want to calculate these dynamically later)
    const pointsCollection = tournamentRef.collection('points');
    for (const team of teams) {
      await pointsCollection.doc(team.name).set({ points: 0 }); // Initialize points to 0
    }
}

function showPage(page) {
    homepage.style.display = 'none';
    tournamentSetupPage.style.display = 'none';
    matchSchedulePage.style.display = 'none';
    pointsTablePage.style.display = 'none';
    page.style.display = 'block';
}

showPage(homepage); // Show homepage initially