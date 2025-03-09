// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAYYa7Gzn-YvgOPVYLFKqosJ6GwVHZYTe0",
    authDomain: "tournament-buddy-63fc8.firebaseapp.com",
    projectId: "tournament-buddy-63fc8",
    storageBucket: "tournament-buddy-63fc8.firebasestorage.app",
    messagingSenderId: "360496704708",
    appId: "1:360496704708:web:934d4ec387506251c8ed91",
    measurementId: "G-9LSWB960TX"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const pages = document.querySelectorAll('.page');
const homepage = document.getElementById('homepage');
const tournamentSetupPage = document.getElementById('tournamentSetupPage');
const matchSchedulePage = document.getElementById('matchSchedulePage');
const pointsTablePage = document.getElementById('pointsTablePage');

const tournamentSetupButton = document.getElementById('tournamentSetup');
const matchScheduleButton = document.getElementById('matchSchedule');
const pointsTableButton = document.getElementById('pointsTable');

const tournamentNameInput = document.getElementById('tournamentName');
const teamsContainer = document.getElementById('teamsContainer');
const addTeamButton = document.getElementById('addTeam');
const goToMatchScheduleButton = document.getElementById('goToMatchSchedule');
const deleteTournamentButton = document.getElementById('deleteTournament');
const backToHomeFromSetupButton = document.getElementById('backToHomeFromSetup');

const tournamentNameDisplay = document.getElementById('tournamentNameDisplay');
const matchScheduleTable = document.getElementById('matchScheduleTable');
const saveMatchScheduleButton = document.getElementById('saveMatchSchedule');
const goToPointsTableFromScheduleButton = document.getElementById('goToPointsTableFromSchedule');
const backToHomeFromScheduleButton = document.getElementById('backToHomeFromSchedule');

const tournamentSelect = document.getElementById('tournamentSelect');
const pointsTable = document.getElementById('pointsTable');
const backToHomeFromPointsButton = document.getElementById('backToHomeFromPoints');

// App State
let currentPage = homepage;
let teams = [];
let matches = [];
let currentTournamentId = null;
let currentTournamentName = '';

const teamIcons = [
    { bg: '#3F51B5', text: '#FFF' }, // Indigo
    { bg: '#F44336', text: '#FFF' }, // Red
    { bg: '#4CAF50', text: '#FFF' }, // Green
    { bg: '#FF9800', text: '#000' }, // Orange
    { bg: '#9C27B0', text: '#FFF' }, // Purple
    { bg: '#00BCD4', text: '#000' }, // Cyan
    { bg: '#FFEB3B', text: '#000' }, // Yellow
    { bg: '#795548', text: '#FFF' }, // Brown
    { bg: '#607D8B', text: '#FFF' }, // Blue Grey
    { bg: '#E91E63', text: '#FFF' }  // Pink
];

// Utility Functions
function showPage(page) {
    pages.forEach(p => p.classList.remove('active'));
    page.classList.add('active');
    currentPage = page;

    if (page === matchSchedulePage && currentTournamentName) {
        tournamentNameDisplay.textContent = currentTournamentName;
        renderMatchSchedule();
    } else if (page === pointsTablePage) {
        loadTournamentSelect();
    } else if (page === tournamentSetupPage) {
        renderTeams();
    }
}

function getTeamIcon(index) {
    return teamIcons[index % teamIcons.length];
}

function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
}

// Firebase Functions
async function saveTournamentData() {
    if (!tournamentNameInput.value.trim()) {
        alert('Please enter a tournament name');
        return null;
    }
    if (teams.length < 2) {
        alert('Please add at least 2 teams');
        return null;
    }

    try {
        const tournamentData = {
            name: tournamentNameInput.value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        let tournamentRef;
        if (currentTournamentId) {
            tournamentRef = db.collection('tournaments').doc(currentTournamentId);
            await tournamentRef.update(tournamentData);
        } else {
            tournamentRef = await db.collection('tournaments').add(tournamentData);
            currentTournamentId = tournamentRef.id;
        }
        currentTournamentName = tournamentData.name;

        const teamsRef = tournamentRef.collection('teams');
        const batch = db.batch();
        const existingTeams = await teamsRef.get();
        existingTeams.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        teams.forEach((team, index) => {
            teamsRef.doc(team.name).set({
                player1: team.player1,
                player2: team.player2,
                iconIndex: index
            });
        });

        const pointsRef = tournamentRef.collection('points');
        const pointsBatch = db.batch();
        const existingPoints = await pointsRef.get();
        existingPoints.forEach(doc => pointsBatch.delete(doc.ref));
        await pointsBatch.commit();

        teams.forEach(team => {
            pointsRef.doc(team.name).set({ points: 0, matchesPlayed: 0, won: 0, lost: 0 });
        });

        return currentTournamentId;
    } catch (error) {
        console.error('Error saving tournament:', error);
        alert('Failed to save tournament.');
        return null;
    }
}

async function deleteTournament() {
    if (!currentTournamentId) {
        alert('No tournament to delete.');
        return;
    }
    if (confirm('Are you sure you want to delete this tournament? This will remove all associated data.')) {
        try {
            const tournamentRef = db.collection('tournaments').doc(currentTournamentId);
            const teamsSnap = await tournamentRef.collection('teams').get();
            const matchesSnap = await tournamentRef.collection('matches').get();
            const pointsSnap = await tournamentRef.collection('points').get();

            const batch = db.batch();
            teamsSnap.forEach(doc => batch.delete(doc.ref));
            matchesSnap.forEach(doc => batch.delete(doc.ref));
            pointsSnap.forEach(doc => batch.delete(doc.ref));
            batch.delete(tournamentRef);
            await batch.commit();

            currentTournamentId = null;
            currentTournamentName = '';
            teams = [];
            matches = [];
            tournamentNameInput.value = '';
            renderTeams();
            showPage(homepage);
            alert('Tournament deleted successfully.');
        } catch (error) {
            console.error('Error deleting tournament:', error);
            alert('Failed to delete tournament.');
        }
    }
}

async function loadTournamentSelect() {
    try {
        const tournamentsSnapshot = await db.collection('tournaments').orderBy('createdAt', 'desc').get();
        tournamentSelect.innerHTML = '<option value="">Select Tournament</option>';
        tournamentsSnapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            tournamentSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading tournaments:', error);
    }
}

async function saveMatches() {
    if (!currentTournamentId) return;
    try {
        const matchesRef = db.collection('tournaments').doc(currentTournamentId).collection('matches');
        const batch = db.batch();
        const existingMatches = await matchesRef.get();
        existingMatches.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        matches.forEach(match => {
            if (match.team1 || match.team2) matchesRef.add(match);
        });
        await updatePointsTable();
        alert('Matches saved successfully');
    } catch (error) {
        console.error('Error saving matches:', error);
        alert('Failed to save matches.');
    }
}

async function updatePointsTable() {
    if (!currentTournamentId) return;
    try {
        const pointsRef = db.collection('tournaments').doc(currentTournamentId).collection('points');
        const points = {};
        teams.forEach((team, index) => {
            points[team.name] = { points: 0, matchesPlayed: 0, won: 0, lost: 0, iconIndex: index };
        });

        matches.forEach(match => {
            if (match.team1Score && match.team2Score && match.team1 && match.team2) {
                const score1 = parseInt(match.team1Score);
                const score2 = parseInt(match.team2Score);
                if (!isNaN(score1) && !isNaN(score2)) {
                    points[match.team1].matchesPlayed++;
                    points[match.team2].matchesPlayed++;
                    if (score1 > score2) {
                        points[match.team1].points += 2;
                        points[match.team1].won++;
                        points[match.team2].lost++;
                    } else if (score2 > score1) {
                        points[match.team2].points += 2;
                        points[match.team2].won++;
                        points[match.team1].lost++;
                    }
                }
            }
        });

        const batch = db.batch();
        for (const [teamName, data] of Object.entries(points)) {
            batch.set(pointsRef.doc(teamName), data);
        }
        await batch.commit();
    } catch (error) {
        console.error('Error updating points:', error);
    }
}

async function loadPointsTable(tournamentId) {
    if (!tournamentId) return;
    try {
        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
        if (!tournamentDoc.exists) {
            alert('Tournament not found.');
            return;
        }

        currentTournamentId = tournamentId;
        currentTournamentName = tournamentDoc.data().name;

        // Load teams
        const teamsSnap = await tournamentDoc.ref.collection('teams').get();
        teams = [];
        teamsSnap.forEach(doc => {
            const data = doc.data();
            teams.push({ name: doc.id, player1: data.player1, player2: data.player2, iconIndex: data.iconIndex });
        });

        // Load matches
        const matchesSnap = await tournamentDoc.ref.collection('matches').get();
        matches = [];
        matchesSnap.forEach(doc => matches.push({ matchNumber: doc.data().matchNumber, ...doc.data() }));

        // Update points based on loaded matches
        await updatePointsTable();

        // Load and display points
        const pointsSnap = await tournamentDoc.ref.collection('points').get();
        const pointsData = [];
        pointsSnap.forEach(doc => {
            pointsData.push({ team: doc.id, ...doc.data() });
        });

        pointsData.sort((a, b) => b.points - a.points);
        const tbody = pointsTable.querySelector('tbody');
        tbody.innerHTML = '';

        pointsData.forEach((team, index) => {
            const row = tbody.insertRow();
            row.classList.add('highlight-row');
            setTimeout(() => row.classList.remove('highlight-row'), 200 * index);

            row.insertCell().textContent = index + 1;
            row.insertCell().innerHTML = `
                <div class="team-cell">
                    <div class="team-icon" style="background-color: ${getTeamIcon(team.iconIndex).bg}; color: ${getTeamIcon(team.iconIndex).text}">
                        ${getInitials(team.team)}
                    </div>
                    ${team.team}
                </div>
            `;
            row.insertCell().textContent = team.points;
            row.insertCell().textContent = team.matchesPlayed;
            row.insertCell().textContent = team.won;
            row.insertCell().textContent = team.lost;
        });
    } catch (error) {
        console.error('Error loading points table:', error);
        alert('Failed to load points table.');
    }
}

// Team Management
function renderTeams() {
    teamsContainer.innerHTML = '';
    teams.forEach((team, index) => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-card';
        const icon = getTeamIcon(index);
        teamDiv.innerHTML = `
            <div class="team-name">
                <div class="team-icon" style="background-color: ${icon.bg}; color: ${icon.text}">
                    ${getInitials(team.name)}
                </div>
                ${team.name}
            </div>
            <div class="player-list">
                <div class="player-item">${team.player1}</div>
                <div class="player-item">${team.player2}</div>
            </div>
            <button class="delete-team" data-index="${index}">Delete</button>
        `;
        teamsContainer.appendChild(teamDiv);
    });

    document.querySelectorAll('.delete-team').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (confirm(`Delete team ${teams[index].name}?`)) {
                teams.splice(index, 1);
                renderTeams();
            }
        });
    });
}

function addTeam() {
    const teamName = prompt('Enter team name (e.g., Team 1 Riseup):');
    if (!teamName || teams.some(t => t.name === teamName)) {
        alert('Invalid or duplicate team name.');
        return;
    }

    const player1 = prompt(`Enter Player 1 for ${teamName}:`);
    if (!player1) return;

    const player2 = prompt(`Enter Player 2 for ${teamName}:`);
    if (!player2) return;

    teams.push({ name: teamName, player1, player2, iconIndex: teams.length });
    renderTeams();
}

// Match Schedule Management
function renderMatchSchedule() {
    const tbody = matchScheduleTable.querySelector('tbody');
    tbody.innerHTML = '';

    if (matches.length === 0) {
        for (let i = 1; i <= 100; i++) {
            matches.push({
                matchNumber: i,
                date: null,
                team1: null,
                team1Player1: null,
                team1Player2: null,
                team1Score: null,
                team2: null,
                team2Player1: null,
                team2Player2: null,
                team2Score: null
            });
        }
    }

    matches.forEach((match, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${match.matchNumber}</td>
            <td><input type="date" class="match-date" value="${match.date || ''}"></td>
            <td><select class="team1-select">
                <option value="">Select Team</option>
                ${teams.map(t => `<option value="${t.name}" ${match.team1 === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
            </select></td>
            <td><input type="text" class="team1-player1" value="${match.team1Player1 || ''}"></td>
            <td><input type="text" class="team1-player2" value="${match.team1Player2 || ''}"></td>
            <td><input type="number" class="team1-score" value="${match.team1Score || ''}"></td>
            <td><select class="team2-select">
                <option value="">Select Team</option>
                ${teams.map(t => `<option value="${t.name}" ${match.team2 === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
            </select></td>
            <td><input type="text" class="team2-player1" value="${match.team2Player1 || ''}"></td>
            <td><input type="text" class="team2-player2" value="${match.team2Player2 || ''}"></td>
            <td><input type="number" class="team2-score" value="${match.team2Score || ''}"></td>
            <td><button class="delete-match" data-index="${index}">Delete</button></td>
        `;

        const team1Select = row.querySelector('.team1-select');
        const team2Select = row.querySelector('.team2-select');

        team1Select.addEventListener('change', (e) => {
            const team = teams.find(t => t.name === e.target.value);
            matches[index].team1 = e.target.value;
            if (team) {
                matches[index].team1Player1 = team.player1;
                matches[index].team1Player2 = team.player2;
                row.querySelector('.team1-player1').value = team.player1;
                row.querySelector('.team1-player2').value = team.player2;
            }
        });

        team2Select.addEventListener('change', (e) => {
            const team = teams.find(t => t.name === e.target.value);
            matches[index].team2 = e.target.value;
            if (team) {
                matches[index].team2Player1 = team.player1;
                matches[index].team2Player2 = team.player2;
                row.querySelector('.team2-player1').value = team.player1;
                row.querySelector('.team2-player2').value = team.player2;
            }
        });

        row.querySelector('.match-date').addEventListener('change', (e) => matches[index].date = e.target.value);
        row.querySelector('.team1-player1').addEventListener('change', (e) => matches[index].team1Player1 = e.target.value);
        row.querySelector('.team1-player2').addEventListener('change', (e) => matches[index].team1Player2 = e.target.value);
        row.querySelector('.team1-score').addEventListener('change', (e) => matches[index].team1Score = e.target.value);
        row.querySelector('.team2-player1').addEventListener('change', (e) => matches[index].team2Player1 = e.target.value);
        row.querySelector('.team2-player2').addEventListener('change', (e) => matches[index].team2Player2 = e.target.value);
        row.querySelector('.team2-score').addEventListener('change', (e) => matches[index].team2Score = e.target.value);

        row.querySelector('.delete-match').addEventListener('click', () => {
            if (confirm(`Delete match #${match.matchNumber}?`)) {
                matches.splice(index, 1);
                matches.forEach((m, i) => m.matchNumber = i + 1);
                renderMatchSchedule();
            }
        });
    });
}

// Event Listeners
tournamentSetupButton.addEventListener('click', () => showPage(tournamentSetupPage));
matchScheduleButton.addEventListener('click', () => {
    if (currentTournamentId) showPage(matchSchedulePage);
    else alert('Please set up a tournament first');
});
pointsTableButton.addEventListener('click', () => showPage(pointsTablePage));

addTeamButton.addEventListener('click', addTeam);
goToMatchScheduleButton.addEventListener('click', async () => {
    const tournamentId = await saveTournamentData();
    if (tournamentId) showPage(matchSchedulePage);
});
deleteTournamentButton.addEventListener('click', deleteTournament);
backToHomeFromSetupButton.addEventListener('click', () => showPage(homepage));

saveMatchScheduleButton.addEventListener('click', saveMatches);
goToPointsTableFromScheduleButton.addEventListener('click', () => showPage(pointsTablePage));
backToHomeFromScheduleButton.addEventListener('click', () => showPage(homepage));

tournamentSelect.addEventListener('change', (e) => loadPointsTable(e.target.value));
backToHomeFromPointsButton.addEventListener('click', () => showPage(homepage));

// Initial Setup
showPage(homepage);