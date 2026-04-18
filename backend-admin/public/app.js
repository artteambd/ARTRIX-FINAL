// ChartX Admin Dashboard JavaScript
const API_BASE = window.location.origin;
let authToken = localStorage.getItem('admin_token');

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Check auth on load
document.addEventListener('DOMContentLoaded', () => {
  if (authToken) {
    verifyToken();
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      authToken = data.token;
      localStorage.setItem('admin_token', authToken);
      showDashboard();
    } else {
      showLoginError(data.message || 'Invalid credentials');
    }
  } catch (error) {
    showLoginError('Connection error. Please try again.');
  }
});

// Verify token
async function verifyToken() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      showDashboard();
    } else {
      logout();
    }
  } catch (error) {
    logout();
  }
}

// Show login error
function showLoginError(message) {
  loginError.textContent = message;
  loginError.style.display = 'block';
  setTimeout(() => {
    loginError.style.display = 'none';
  }, 3000);
}

// Show dashboard
function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.classList.add('active');
  loadDashboardData();
  loadUsers();
}

// Logout
logoutBtn.addEventListener('click', logout);

function logout() {
  authToken = null;
  localStorage.removeItem('admin_token');
  loginScreen.style.display = 'flex';
  dashboard.classList.remove('active');
}

// Load dashboard stats
async function loadDashboardData() {
  try {
    const response = await fetch(`${API_BASE}/api/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const { dashboard: stats } = data;
      document.getElementById('totalUsers').textContent = stats.users.total || 0;
      document.getElementById('activeUsers').textContent = stats.users.activeToday || 0;
      document.getElementById('signalsToday').textContent = stats.signals.today || 0;
      document.getElementById('chartsAnalyzed').textContent = stats.today.chartsAnalyzed || 0;
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Load users
let allUsers = [];

async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/api/users`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      allUsers = data.users;
      renderUsers(allUsers);
    }
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

// Render users table
function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.email}</td>
      <td>${user.name || '-'}</td>
      <td><span class="badge ${user.membership}">${user.membership}</span></td>
      <td>${user.credits}</td>
      <td><span class="badge ${user.isBlocked ? 'blocked' : 'active'}">${user.isBlocked ? 'Blocked' : 'Active'}</span></td>
      <td>${user.totalSignals || 0}</td>
      <td>
        <button class="action-btn edit" onclick="editUser('${user._id}')">Edit</button>
        <button class="action-btn block" onclick="toggleBlock('${user._id}', ${user.isBlocked})">${user.isBlocked ? 'Unblock' : 'Block'}</button>
        <button class="action-btn warn" onclick="openWarningModal('${user._id}')">Warn</button>
        <button class="action-btn delete" onclick="deleteUser('${user._id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Search users
document.getElementById('searchUsers').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allUsers.filter(user => 
    user.email.toLowerCase().includes(query) ||
    (user.name && user.name.toLowerCase().includes(query))
  );
  renderUsers(filtered);
});

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}Tab`).classList.add('active');
  });
});

// Edit user
function editUser(userId) {
  const user = allUsers.find(u => u._id === userId);
  if (!user) return;
  
  document.getElementById('editUserId').value = userId;
  document.getElementById('editCredits').value = user.credits;
  document.getElementById('editMembership').value = user.membership;
  document.getElementById('editExtendDays').value = '';
  
  document.getElementById('editModal').classList.add('active');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('active');
}

document.getElementById('editUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userId = document.getElementById('editUserId').value;
  const credits = document.getElementById('editCredits').value;
  const membership = document.getElementById('editMembership').value;
  const extendDays = document.getElementById('editExtendDays').value;
  
  try {
    // Update credits
    await fetch(`${API_BASE}/api/users/${userId}/credits`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ credits: Number(credits) })
    });
    
    // Update membership
    await fetch(`${API_BASE}/api/users/${userId}/membership`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ membership })
    });
    
    // Extend license if days provided
    if (extendDays && Number(extendDays) > 0) {
      await fetch(`${API_BASE}/api/users/${userId}/extend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ days: Number(extendDays) })
      });
    }
    
    closeModal();
    loadUsers();
    alert('User updated successfully!');
  } catch (error) {
    alert('Failed to update user');
  }
});

// Toggle block
async function toggleBlock(userId, isCurrentlyBlocked) {
  if (!confirm(`Are you sure you want to ${isCurrentlyBlocked ? 'unblock' : 'block'} this user?`)) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/users/${userId}/block`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ isBlocked: !isCurrentlyBlocked })
    });
    
    if (response.ok) {
      loadUsers();
    }
  } catch (error) {
    alert('Failed to update user');
  }
}

// Delete user
async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      loadUsers();
    }
  } catch (error) {
    alert('Failed to delete user');
  }
}

// Warning modal
function openWarningModal(userId) {
  document.getElementById('warnUserId').value = userId;
  document.getElementById('warnMessage').value = '';
  document.getElementById('warningModal').classList.add('active');
}

function closeWarningModal() {
  document.getElementById('warningModal').classList.remove('active');
}

document.getElementById('warningForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userId = document.getElementById('warnUserId').value;
  const type = document.getElementById('warnType').value;
  const message = document.getElementById('warnMessage').value;
  
  try {
    const response = await fetch(`${API_BASE}/api/warnings/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ userId, type, message })
    });
    
    const data = await response.json();
    
    if (data.success) {
      closeWarningModal();
      alert('Warning sent successfully!');
    } else {
      alert(data.message || 'Failed to send warning');
    }
  } catch (error) {
    alert('Failed to send warning');
  }
});

// Create user
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('newEmail').value;
  const name = document.getElementById('newName').value;
  const password = document.getElementById('newPassword').value;
  const membership = document.getElementById('newMembership').value;
  const credits = document.getElementById('newCredits').value;
  const expiresAt = document.getElementById('newExpiry').value;
  
  try {
    const response = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        email,
        name,
        password: password || null,
        membership,
        credits: Number(credits),
        expiresAt: expiresAt || null
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`User created!\nLicense Key: ${data.user.licenseKey}`);
      document.getElementById('createUserForm').reset();
      loadUsers();
      
      // Switch to users tab
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('[data-tab="users"]').classList.add('active');
      document.getElementById('usersTab').classList.add('active');
    } else {
      alert(data.message || 'Failed to create user');
    }
  } catch (error) {
    alert('Failed to create user');
  }
});

// Broadcast
document.getElementById('broadcastForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const type = document.getElementById('broadcastType').value;
  const message = document.getElementById('broadcastMessage').value;
  
  if (!message.trim()) {
    alert('Please enter a message');
    return;
  }
  
  if (!confirm('Send this message to ALL users?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/warnings/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ type, message })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(data.message);
      document.getElementById('broadcastMessage').value = '';
    } else {
      alert(data.message || 'Failed to broadcast');
    }
  } catch (error) {
    alert('Failed to broadcast');
  }
});
