import React from 'react';
import '../css/Sidebar.css';

function Sidebar() {
  return (
    <div className="sidebar">
      <h2>IBrain Module</h2>
      <div className="channels">
        <p># Submit New Idea</p>
        <p># My Ideas</p>
        <p># Daily Shared Idea</p>
      </div>
    </div>
  );
}

export default Sidebar;
