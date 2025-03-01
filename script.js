// script.js
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
  const db = firebase.firestore();
  
  const homepage = document.getElementById('homepage');
  const tournamentSetupPage = document.getElementById('tournamentSetupPage');
  const matchSchedulePage = document.getElementById('matchSchedulePage');
  const pointsTablePage = document.getElementById('pointsTablePage');
  
  const content = document.getElementById('content');
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
  let currentTournamentId = null;
  
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
          teamDiv.textContent = `<span class="math-inline">\{team\.name\} \(</span>{team.player1}, ${team.player2})`;
          teamsContainer.appendChild(teamDiv);
      });
  }
  
  // Match Schedule Generation and Update
  function generateMatchSchedule() {
      matchScheduleTable.querySelector('tbody').innerHTML = '';
      matches = [];
      if (teams.length > 1) {
          for (let i = 0; i < Math.min(100, (teams.length * (teams.length - 1)) / 2); i++) {
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
                  if (k < matches.length) {
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
              Object.values(match).forEach((value, index) => {
                  const cell = row.insertCell();
                  if (index === 7 || index === 8) { // Date and Score cells
                      cell.contentEditable = true;
                  } else {
                      cell.textContent = value || "";
                  }
              });
          });
      }
  }
  
  matchScheduleTable.addEventListener('input', (event) => {
      const target = event.target;
      if (target.tagName === 'TD' && (target.cellIndex === 7 || target.cellIndex === 8)) {
          updateMatchData();
      }
  });
  
  function updateMatchData() {
      const rows = matchScheduleTable.querySelectorAll('tbody tr');
      matches = Array.from(rows).map(row => {
          const cells = row.querySelectorAll('td');
          return {
              matchNumber: parseInt(cells[0].textContent),
              team1: cells[1].textContent,
              player1Team1: cells[2].textContent,
              player2Team1: cells[3].textContent,
              team2: cells[4].textContent,
              player1Team2: cells[5].textContent,
              player2Team2: cells[6].textContent,
              date: cells[7].textContent,
              score: cells[8].textContent,
          };
      });
      updatePointsTable();
  }
  
  // Points Table Calculation and Update
  function updatePointsTable() {
      if (!currentTournamentId) return;
  
      const teamPoints = {};
      teams.forEach(team => teamPoints[team.name] = 0);
  
      matches.forEach(match => {
          if (match.score) {
              const scores = match.score.split('-');
              if (scores.length === 2) {
                  const score1 = parseInt(scores[0]);
                  const score2 = parseInt(scores[1]);
  
                  if (!isNaN(score1) && !isNaN(score2)) {
                      if (score1 > score2) {
                          teamPoints[match.team1] += 2; // Team 1 wins
                      } else if (score2 > score1) {
                          teamPoints[match.team2] += 2; // Team 2 wins
                      }
                  }
              }
          }
      });
  
      const pointsCollection = db.collection('tournaments').doc(currentTournamentId).collection('points');
      Object.entries(teamPoints).forEach(([teamName, points]) => {
          pointsCollection.doc(teamName).update({ points: points });
      });
  }
  
  // Points Table Display
  function populateTournamentSelect() {
      tournamentSelect.innerHTML = '';
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
      currentTournamentId = tournamentSelect.value;
      if (currentTournamentId) {
          db.collection('tournaments').