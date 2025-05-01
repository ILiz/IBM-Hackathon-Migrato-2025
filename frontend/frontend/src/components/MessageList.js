import React from 'react';
import '../css/MessageList.css';


function formatBotMessage(text) {
  const lines = text.split('\n').filter(Boolean);

  const titleLine = lines.find((line) => line.trim().startsWith('Title:'));
  const expansionStart = lines.find((line) => line.trim().startsWith('Expansion:'));
  const imageStart = lines.find((line) => line.trim().startsWith('Image Prompt:'));

  const title = titleLine?.replace('Title:', '').trim();
  const expansion = expansionStart?.replace('Expansion:', '').trim();
  const imagePrompt = imageStart?.replace('Image Prompt:', '').trim();

  return (
  title !== undefined ? (
    <div className="granite-reply">
      {title && <h3 className="granite-title">{title}</h3>}
      {expansion && (
        <p className="granite-expansion">
          {/* Convert new lines into <br /> tags */}
          {expansion.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              <br />
            </React.Fragment>
          ))}
        </p>
      )}
      {imagePrompt && (
        <div className="granite-image-prompt">
          <strong>Image Prompt:</strong> <em>{imagePrompt}</em>
        </div>
      )}
    </div>
  ) : (
    <div className="granite-reply">
      {text && <div className="granite-title">{text}</div>}
    </div>
  )
  );
}

function MessageList({ messages, isLoading, onLike, onComment, activeChannel }) {
  return (
    <div className="message-list">
      {isLoading && <div className="spinner">Loading...</div>}
      {messages && messages.length > 0 ? (
        messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.sender === 'bot' ? 'bot' : 'user'}`}
          >
            <div className={message.sender === 'bot' ? 'bot-message' : 'user-message'}>
              {message.sender === 'bot' ? formatBotMessage(message.text) : message.text}
                {message.likes !== undefined && (
                    <div className="idea-meta">
                        <span>👍 {message.likes}</span>
                        <span>💬 {message.comments.length}</span>
                    </div>
                )}

                {/* Comments list */}
      {message.comments && message.comments.length > 0 && (
        <div className="message-comments">
          <strong>Comments:</strong>
          <ul>
            {message.comments.map((comment, idx) => (
              <li key={idx}>– {comment}</li>
            ))}
          </ul>
        </div>
      )}
                {activeChannel === 'daily_shared_idea' && message.likes !== undefined && (
                <>
                    <button onClick={() => onLike(message.text)}
                    disabled={JSON.parse(sessionStorage.getItem('likedIdeas') || '[]').includes(message.text)}>
                    👍 Like
                    </button>
                    <button onClick={() => onComment(message.text)}>
                    💬 Comment
                    </button>
                </>
                )}
                <div className="message-date">
                    <small> {message.date} </small>
                </div>
            </div>
          </div>
        ))
      ) : (
        <div className="bot-message">{formatBotMessage('No messages yet. Start a conversation!')}</div>
      )}
    </div>
  );
}

export default MessageList;

