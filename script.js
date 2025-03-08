// Initialize Firebase
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAYYa7Gzn-YvgOPVYLFKqosJ6GwVHZYTe0",
    authDomain: "tournament-buddy-63fc8.firebaseapp.com",
    projectId: "tournament-buddy-63fc8",
    storageBucket: "tournament-buddy-63fc8.firebasestorage.app",
    messagingSenderId: "360496704708",
    appId: "1:360496704708:web:934d4ec387506251c8ed91",
    measurementId: "G-9LSWB960TX"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
// Pages
const pages = document.querySelectorAll('.page');
const homepage = document.getElementById('homepage');
const tournamentSetupPage = document.getElementById('tournamentSetupPage');
const matchSchedulePage = document.getElementById('matchSchedulePage');
const pointsTablePage = document.getElementById('pointsTablePage');

// Homepage Buttons
const tournamentSetupButton = document.getElementById('tournamentSetup');
const matchScheduleButton = document.getElementById('matchSchedule');
const pointsTableButton = document.getElementById('pointsTable');

// Tournament Setup Elements
const tournamentNameInput = document.getElementById('tournamentName');
const teamsContainer = document.getElementById('teamsContainer');
const addTeamButton = document.getElementById('addTeam');
const goToMatchScheduleButton = document.getElementById('goToMatchSchedule');
const backToHomeFromSetupButton = document.getElementById('backToHomeFromSetup');

// Match Schedule Elements
const tournamentNameDisplay = document.getElementById('tournamentNameDisplay');
const matchScheduleTable = document.getElementById('matchScheduleTable');
const saveMatchScheduleButton = document.getElementById('saveMatchSchedule');
const goToPointsTableFromScheduleButton = document.getElementById('goToPointsTableFromSchedule');
const backToHomeFromScheduleButton = document.getElementById('backToHomeFromSchedule');

// Points Table Elements
const tournamentSelect = document.getElementById('tournamentSelect');
const pointsTable = document.getElementById('pointsTable');
const backToHomeFromPointsButton = document.getElementById('backToHomeFromPoints');

// App State
let currentPage = homepage;
let teams = [];
let matches = [];
let currentTournamentId = null;
let currentTournamentName = '';

// Team Icons/Colors for better visibility
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
    }
}

function getTeamIcon(index) {
    const iconIndex = index % teamIcons.length;
    return teamIcons[iconIndex];
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        let tournamentRef;
        if (currentTournamentId) {
            tournamentRef = db.collection('tournaments').doc(currentTournamentId);
            await tournamentRef.update({
                name: tournamentData.name,
                updatedAt: tournamentData.updatedAt
            });
        } else {
            tournamentRef = await db.collection('tournaments').add(tournamentData);
            currentTournamentId = tournamentRef.id;
        }
        
        const teamsRef = tournamentRef.collection('teams');
        if (currentTournamentId) {
            const existingTeams = await teamsRef.get();
            const batch = db.batch();
            existingTeams.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        
        for (const team of teams) {
            await teamsRef.doc(team.name).set({
                player1: team.player1,
                player2: team.player2,
                iconIndex: team.iconIndex
            });
        }
        
        const pointsRef = tournamentRef.collection('points');
        for (const team of teams) {
            await pointsRef.doc(team.name).set({
                points: 0,
                matchesPlayed: 0,
                won: 0,
                lost: 0
            });
        }
        
        currentTournamentName = tournamentData.name;
        return currentTournamentId;
    } catch (error) {
        console.error('Error saving tournament data:', error);
        alert('Failed to save tournament data. Please try again.');
        return null;
    }
}

async function loadTournament(tournamentId) {
    try {
        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
        if (!tournamentDoc.exists) {
            alert('Tournament not found');
            return false;
        }
        
        const tournamentData = tournamentDoc.data();
        currentTournamentName = tournamentData.name;
        currentTournamentId = tournamentId;
        tournamentNameInput.value = tournamentData.name;
        
        teams = [];
        const teamsSnapshot = await tournamentDoc.ref.collection('teams').get();
        teamsSnapshot.forEach(doc => {
            const teamData = doc.data();
            teams.push({
                name: doc.id,
                player1: teamData.player1,
                player2: teamData.player2,
                iconIndex: teamData.iconIndex || teams.length
            });
        });
        
        renderTeams();
        
        matches = [];
        const matchesSnapshot = await tournamentDoc.ref.collection('matches').orderBy('matchNumber').get();
        matchesSnapshot.forEach(doc => {
            matches.push({ id: doc.id, ...doc.data() });
        });
        
        return true;
    } catch (error) {
        console.error('Error loading tournament:', error);
        alert('Failed to load tournament. Please try again.');
        return false;
    }
}

async function saveMatches() {
    try {
        if (!currentTournamentId) return;
        
        const matchesRef = db.collection('tournaments').doc(currentTournamentId).collection('matches');
        const existingMatches = await matchesRef.get();
        const batch = db.batch();
        existingMatches.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        for (const match of matches) {
            const { id, ...matchData } = match;
            await matchesRef.add(matchData);
        }
        
        await updatePointsTable();
        alert('Match schedule saved successfully');
    } catch (error) {
        console.error('Error saving matches:', error);
        alert('Failed to save match schedule. Please try again.');
    }
}

async function updatePointsTable() {
    if (!currentTournamentId) return;
    
    try {
        const pointsRef = db.collection('tournaments').doc(currentTournamentId).collection('points');
        const teams = {};
        const teamsSnapshot = await db.collection('tournaments').doc(currentTournamentId).collection('teams').get();
        teamsSnapshot.forEach(doc => {
            teams[doc.id] = { points: 0, matchesPlayed: 0, won: 0, lost: 0 };
        });
        
        matches.forEach(match => {
            if (match.team1Score !== undefined && match.team2Score !== undefined && match.team1 && match.team2) {
                const team1Score = parseInt(match.team1Score);
                const team2Score = parseInt(match.team2Score);
                
                if (!isNaN(team1Score) && !isNaN(team2Score)) {
                    if (teams[match.team1]) teams[match.team1].matchesPlayed++;
                    if (teams[match.team2]) teams[match.team2].matchesPlayed++;
                    
                    if (team1Score > team2Score) {
                        if (teams[match.team1]) {
                            teams[match.team1].points += 2;
                            teams[match.team1].won++;
                        }
                        if (teams[match.team2]) teams[match.team2].lost++;
                    } else if (team2Score > team1Score) {
                        if (teams[match.team2]) {
                            teams[match.team2].points += 2;
                            teams[match.team2].won++;
                        }
                        if (teams[match.team1]) teams[match.team1].lost++;
                    }
                }
            }
        });
        
        const batch = db.batch();
        for (const [teamName, data] of Object.entries(teams)) {
            const ref = pointsRef.doc(teamName);
            batch.set(ref, data);
        }
        await batch.commit();
        
        return true;
    } catch (error) {
        console.error('Error updating points table:', error);
        return false;
    }
}

async function loadPointsTable(tournamentId) {
    if (!tournamentId) return;
    
    try {
        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
        if (!tournamentDoc.exists) return;
        
        currentTournamentId = tournamentId;
        currentTournamentName = tournamentDoc.data().name;
        
        const pointsSnapshot = await tournamentDoc.ref.collection('points').get();
        const pointsData = [];
        pointsSnapshot.forEach(doc => {
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
                    <div class="team-icon" style="background-color: ${getTeamIcon(index).bg}; color: ${getTeamIcon(index).text}">
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
        
        return true;
    } catch (error) {
        console.error('Error loading points table:', error);
        return false;
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

// Team Management
function renderTeams() {
    teamsContainer.innerHTML = '';
    
    teams.forEach((team, index) => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-card';
        const teamIcon = getTeamIcon(team.iconIndex || index);
        
        teamDiv.innerHTML = `
            <div class="team-name">
                <div class="team-icon" style="background-color: ${teamIcon.bg}; color: ${teamIcon.text}">
                    ${getInitials(team.name)}
                </div>
                ${team.name}
            </div>
            <div class="player-list">
                <div class="player-item">
                    <span class="player-name">Player 1: ${team.player1}</span>
                    <button class="edit-button" data-team-index="${index}" data-player="1">Edit</button>
                </div>
                <div class="player-item">
                    <span class="player-name">Player 2: ${team.player2}</span>
                    <button class="edit-button" data-team-index="${index}" data-player="2">Edit</button>
                </div>
            </div>
            <button class="secondary-button remove-team" data-team-index="${index}">Remove Team</button>
        `;
        
        teamsContainer.appendChild(teamDiv);
    });
    
    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const teamIndex = e.target.dataset.teamIndex;
            const playerNum = e.target.dataset.player;
            const newName = prompt(`Enter new name for ${playerNum === '1' ? 'Player 1' : 'Player 2'}:`, teams[teamIndex][`player${playerNum}`]);
            if (newName) {
                teams[teamIndex][`player${playerNum}`] = newName;
                renderTeams();
            }
        });
    });
    
    document.querySelectorAll('.remove-team').forEach(button => {
        button.addEventListener('click', (e) => {
            const teamIndex = e.target.dataset.teamIndex;
            teams.splice(teamIndex, 1);
            renderTeams();
        });
    });
}

function addTeam() {
    const teamName = prompt('Enter team name:');
    if (!teamName) return;
    
    if (teams.some(t => t.name === teamName)) {
        alert('Team name already exists!');
        return;
    }
    
    const player1 = prompt('Enter Player 1 name:');
    if (!player1) return;
    
    const player2 = prompt('Enter Player 2 name:');
    if (!player2) return;
    
    teams.push({
        name: teamName,
        player1,
        player2,
        iconIndex: teams.length
    });
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
            <td>
                <select class="team1-select">
                    <option value="">Select Team</option>
                    ${teams.map(t => `<option value="${t.name}" ${match.team1 === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
            </td>
            <td><input type="text" class="team1-player1" value="${match.team1Player1 || ''}"></td>
            <td><input type="text" class="team1-player2" value="${match.team1Player2 || ''}"></td>
            <td><input type="number" class="team1-score" value="${match.team1Score || ''}"></td>
            <td>
                <select class="team2-select">
                    <option value="">Select Team</option>
                    ${teams.map(t => `<option value="${t.name}" ${match.team2 === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
            </td>
            <td><input type="text" class="team2-player1" value="${match.team2Player1 || ''}"></td>
            <td><input type="text" class="team2-player2" value="${match.team2Player2 || ''}"></td>
            <td><input type="number" class="team2-score" value="${match.team2Score || ''}"></td>
        `;
        
        const team1Select = row.querySelector('.team1-select');
        const team2Select = row.querySelector('.team2-select');
        
        team1Select.addEventListener('change', (e) => {
            const teamName = e.target.value;
            const team = teams.find(t => t.name === teamName);
            matches[index].team1 = teamName;
            if (team) {
                matches[index].team1Player1 = team.player1;
                matches[index].team1Player2 = team.player2;
                row.querySelector('.team1-player1').value = team.player1;
                row.querySelector('.team1-player2').value = team.player2;
            }
        });
        
        team2Select.addEventListener('change', (e) => {
            const teamName = e.target.value;
            const team = teams.find(t => t.name === teamName);
            matches[index].team2 = teamName;
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
backToHomeFromSetupButton.addEventListener('click', () => showPage(homepage));

saveMatchScheduleButton.addEventListener('click', saveMatches);
goToPointsTableFromScheduleButton.addEventListener('click', () => showPage(pointsTablePage));
backToHomeFromScheduleButton.addEventListener('click', () => showPage(homepage));

tournamentSelect.addEventListener('change', (e) => {
    if (e.target.value) loadPointsTable(e.target.value);
});
backToHomeFromPointsButton.addEventListener('click', () => showPage(homepage));

// Initial Setup
showPage(homepage);