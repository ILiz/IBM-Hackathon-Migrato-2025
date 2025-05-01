import React from 'react';
import '../css/Header.css';

function Header({ activeChannel }) {
  return (
    <div className="chat-header">
      <h2>Channel - #{activeChannel.charAt(0).toUpperCase() + activeChannel.slice(1)}</h2>
    </div>
  );
}

export default Header;
