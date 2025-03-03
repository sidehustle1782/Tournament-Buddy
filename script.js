// Initialize Firebase
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
    pages.forEach(p => {
        p.classList.remove('active');
    });
    page.classList.add('active');
    currentPage = page;
    
    // Update display based on current page
    if (page === matchSchedulePage && currentTournamentName) {
        tournamentNameDisplay.textContent = currentTournamentName;
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
        // Save tournament data
        const tournamentData = {
            name: tournamentNameInput.value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        let tournamentRef;
        
        if (currentTournamentId) {
            // Update existing tournament
            tournamentRef = db.collection('tournaments').doc(currentTournamentId);
            await tournamentRef.update({
                name: tournamentData.name,
                updatedAt: tournamentData.updatedAt
            });
        } else {
            // Create new tournament
            tournamentRef = await db.collection('tournaments').add(tournamentData);
            currentTournamentId = tournamentRef.id;
        }
        
        // Save teams
        const teamsRef = tournamentRef.collection('teams');
        
        // Clear existing teams if updating
        if (currentTournamentId) {
            const existingTeams = await teamsRef.get();
            const batch = db.batch();
            existingTeams.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
        
        // Add teams
        for (const team of teams) {
            await teamsRef.doc(team.name).set({
                player1: team.player1,
                player2: team.player2,
                iconIndex: team.iconIndex
            });
        }
        
        // Initialize points table
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
        // Load tournament data
        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
        if (!tournamentDoc.exists) {
            alert('Tournament not found');
            return false;
        }
        
        const tournamentData = tournamentDoc.data();
        currentTournamentName = tournamentData.name;
        currentTournamentId = tournamentId;
        tournamentNameInput.value = tournamentData.name;
        
        // Load teams
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
        
        // Load matches
        matches = [];
        const matchesSnapshot = await tournamentDoc.ref.collection('matches').orderBy('matchNumber').get();
        matchesSnapshot.forEach(doc => {
            matches.push({
                id: doc.id,
                ...doc.data()
            });
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
        
        // Clear existing matches
        const existingMatches = await matchesRef.get();
        const batch = db.batch();
        existingMatches.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Add matches
        for (const match of matches) {
            const { id, ...matchData } = match;
            await matchesRef.add(matchData);
        }
        
        // Update points table
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
        
        // Reset points
        const teams = {};
        const teamsSnapshot = await db.collection('tournaments').doc(currentTournamentId).collection('teams').get();
        teamsSnapshot.forEach(doc => {
            teams[doc.id] = {
                points: 0,
                matchesPlayed: 0,
                won: 0,
                lost: 0
            };
        });
        
        // Calculate points from matches
        matches.forEach(match => {
            if (match.team1Score !== undefined && match.team2Score !== undefined &&
                match.team1Score !== null && match.team2Score !== null &&
                match.team1 && match.team2) {
                
                const team1Score = parseInt(match.team1Score);
                const team2Score = parseInt(match.team2Score);
                
                if (!isNaN(team1Score) && !isNaN(team2Score)) {
                    // Increment matches played
                    if (teams[match.team1]) {
                        teams[match.team1].matchesPlayed++;
                    }
                    if (teams[match.team2]) {
                        teams[match.team2].matchesPlayed++;
                    }
                    
                    // Determine winner and assign points
                    if (team1Score > team2Score) {
                        // Team 1 wins
                        if (teams[match.team1]) {
                            teams[match.team1].points += 2;
                            teams[match.team1].won++;
                        }
                        if (teams[match.team2]) {
                            teams[match.team2].lost++;
                        }
                    } else if (team2Score > team1Score) {
                        // Team 2 wins
                        if (teams[match.team2]) {
                            teams[match.team2].points += 2;
                            teams[match.team2].won++;
                        }
                        if (teams[match.team1]) {
                            teams[match.team1].lost++;
                        }
                    }
                    // In case of a tie, no points awarded (or could give 1 point each)
                }
            }
        });
        
        // Update points in Firestore
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
        // Get tournament info
        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
        if (!tournamentDoc.exists) return;
        
        currentTournamentId = tournamentId;
        currentTournamentName = tournamentDoc.data().name;
        
        // Get points data
        const pointsSnapshot = await tournamentDoc.ref.collection('points').get();
        const pointsData = [];
        
        pointsSnapshot.forEach(doc => {
            pointsData.push({
                team: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by points (descending)
        pointsData.sort((a, b) => b.points - a.points);
        
        // Display points table
        const tbody = pointsTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        pointsData.forEach((team, index) => {
            const row = tbody.insertRow();
            row.classList.add('highlight-row');
            
            // Add small delay for animation effect
            setTimeout(() => {
                row.classList.remove('highlight-row');
            }, 200 * index);
            
            // Rank cell
            const rankCell = row.insertCell();
            rankCell.textContent = index + 1;
            
            // Team name cell
            const teamCell = row.insertCell();
            teamCell.innerHTML = `
                <div class="team-cell">
                    <div class="team-icon" style="background-color: ${getTeamIcon(index).bg}; color: ${getTeamIcon(index).text}">
                        ${getInitials(team.team)}
                    </div>
                    ${team.team}
                </div>
            `;
            
            // Points cell
            const pointsCell = row.insertCell();
            pointsCell.textContent = team.points;
            pointsCell.style.fontWeight = 'bold';
            
            // Matches played cell
            const matchesCell = row.insertCell();
            matchesCell.textContent = team.matchesPlayed;
            
            // Won cell
            const wonCell = row.insertCell();
            wonCell.textContent = team.won;
            
            // Lost cell
            const lostCell = row.insertCell();
            lostCell.textContent = team.lost;
        });
        
        return true;
    } catch (error) {
        console.error('Error loading points table:', error);
        return false;
    }
}

// Team Management
function renderTeams() {
    teamsContainer.innerHTML = '';
    
    teams.forEach((team, index) => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-card';
        
        // Set team icon color based on index
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
    
    // Add event listeners for edit and remove buttons
    