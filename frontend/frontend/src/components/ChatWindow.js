import React, { useState } from 'react';
import Header from './Header';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import '../css/ChatWindow.css';
import Login from './Login';


function ChatWindow() {
  //const [user, setUser] = useState(sessionStorage.getItem('user'));
  const [user, setUser] = useState(null);

  const initialChannels = {
    submit_new_idea: [
      { sender: 'bot', text: 'Hello! What idea did you brainstorm and wish to share?' },
    ],
    my_ideas: [
      { sender: 'bot', text: 'Review all your shared ideas.' },
    ],
    daily_shared_idea: [
      { sender: 'bot', text: 'Your daily feed with new ideas.' },
    ],
  };

  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! What idea did you brainstorm and wish to share?' },
  ]);

  const [channels, setChannels] = useState(initialChannels); // Store all channels with messages
  const [activeChannel, setActiveChannel] = useState('submit_new_idea'); // Default active channel
  const [isLoading, setIsLoading] = useState(false); // ✅ this must be inside the function
  const [botMessageId, setBotMessageId] = useState(null); // To track which bot message needs buttons

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleSendMessage = async (text) => {
    if (text.trim() === '') return;

    // Update the active channel's message list with the user's message
    setChannels((prevChannels) => {
      const updatedMessages = [
        ...prevChannels[activeChannel],
        { sender: 'user', text },
      ];

      return {
        ...prevChannels,
        [activeChannel]: updatedMessages,
      };
    });

    setMessages((prev) => [
       ...prev,
       { sender: 'user', text }
    ]);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      setChannels((prevChannels) => {
        const updatedMessages = [
          ...prevChannels[activeChannel],
          { sender: 'bot', text: data.reply },
        ];

        return {
          ...prevChannels,
          [activeChannel]: updatedMessages,
        };
      });
      // Update messages array with the new bot response
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, { sender: 'bot', text: data.reply }];
        // Set botMessageId to the index of the newly added bot message
        setBotMessageId(updatedMessages.length - 1);
        return updatedMessages;
      });
    } catch (err) {
      console.error('Error:', err);
      setChannels((prevChannels) => {
        const updatedMessages = [
          ...prevChannels[activeChannel],
          { sender: 'bot', text: 'Oops, something went wrong.' },
        ];

        return {
          ...prevChannels,
          [activeChannel]: updatedMessages,
        };
      });
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Oops, something went wrong.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

const handleSendRegenerate = async (lastBotMessage) => {
  setIsLoading(true);

  try {
    const res = await fetch('http://localhost:5000/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'regenerate',
        message: lastBotMessage,
      }),
    });

    const data = await res.json();

    setChannels((prevChannels) => {
      const updatedMessages = [
        ...prevChannels[activeChannel],
        { sender: 'bot', text: data.reply },
      ];
      return {
        ...prevChannels,
        [activeChannel]: updatedMessages,
      };
    });

    setMessages((prev) => {
      const updatedMessages = [...prev, { sender: 'bot', text: data.reply }];
      setBotMessageId(updatedMessages.length - 1);
      return updatedMessages;
    });
  } catch (err) {
    console.error('Error:', err);
    setChannels((prevChannels) => {
      const updatedMessages = [
        ...prevChannels[activeChannel],
        { sender: 'bot', text: 'Oops, something went wrong.' },
      ];
      return {
        ...prevChannels,
        [activeChannel]: updatedMessages,
      };
    });
    setMessages((prev) => [
      ...prev,
      { sender: 'bot', text: 'Oops, something went wrong.' },
    ]);
  } finally {
    setIsLoading(false);
  }
};


  const handleChannelChange = async (channel) => {
    setActiveChannel(channel);

    // If user switches to "my_ideas", load from backend
    if (channel === 'my_ideas') {
        try {
            const res = await fetch('http://localhost:5000/api/my_ideas');
            const data = await res.json();

            // Update just the my_ideas channel
            setChannels((prev) => ({
                ...prev,
                my_ideas: data,
            }));
        } catch (err) {
            console.error('Failed to fetch ideas:', err);
        }
    }

    if (channel === 'daily_shared_idea') {
        try {
            const res = await fetch('http://localhost:5000/api/random_idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user }), // Send user info to backend for filtering
      });
            const data = await res.json();

            if (data.error) {
                setChannels((prev) => ({
                    ...prev,
                    daily_shared_idea: [{ sender: 'bot', text: 'No ideas available yet.' }],
                }));
            } else {
        // Filter out ideas created by the current user
        const availableIdeas = data.filter((idea) => idea.userId !== user.id); // Assuming each idea has a 'userId'

        if (availableIdeas.length === 0) {
          setChannels((prev) => ({
            ...prev,
            daily_shared_idea: [{ sender: 'bot', text: 'No other ideas available right now.' }],
          }));
        } else {
          // Pick a random idea from the remaining ideas
          const randomIdea = availableIdeas[Math.floor(Math.random() * availableIdeas.length)];

          const ideaMessage = {
            sender: 'bot',
            text: randomIdea.text,
            likes: randomIdea.likes,
            comments: randomIdea.comments,
            date: randomIdea.date,
          };

          setChannels((prev) => ({
            ...prev,
            daily_shared_idea: [ideaMessage],
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch daily idea:', err);
      setChannels((prev) => ({
        ...prev,
        daily_shared_idea: [{ sender: 'bot', text: 'Failed to load daily idea.' }],
      }));
    }
  }
};

  const handleButtonClick = async (action) => {
    if (action === 'submit') {
      // Handle submit (e.g., send data to backend)
      const ideaToSubmit = messages[botMessageId]?.text;

      if (!ideaToSubmit) return;

      const now = new Date();
      const formattedDate = now.toLocaleString();

      // Save to backend
      try {
        await fetch('http://localhost:5000/api/submit_idea', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: ideaToSubmit }),
        });
      } catch (err) {
        console.error('Failed to save idea to backend:', err);
      }

      // Add the idea to the "my_ideas" channel
      setChannels((prevChannels) => {
        const updatedMyIdeas = [
            ...prevChannels.my_ideas,
            {   sender: 'bot',
                text: ideaToSubmit ,
                likes: 0,
                comments: [],
                date: formattedDate,
            },
        ];
        return {
            ...prevChannels,
            my_ideas: updatedMyIdeas
        };
      });
      setBotMessageId(null);
    } else if (action === 'regenerate') {
      // Handle regenerate (e.g., trigger message regeneration)
      setMessages((prev) => prev.filter((_, index) => index !== botMessageId));
      setBotMessageId(null); // Reset message ID to remove buttons
      handleSendRegenerate('Regenerate message request');
    }
  };

  const handleLike = async (ideaText) => {
  const likedIdeas = JSON.parse(sessionStorage.getItem('likedIdeas') || '[]');

  // Prevent duplicate like
  if (likedIdeas.includes(ideaText)) {
    alert('You already liked this idea.');
    return;
  }

  try {
    const res = await fetch('http://localhost:5000/api/like_idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ideaText }),
    });

    const data = await res.json();
    if (data.error) {
      console.error(data.error);
      return;
    }

    // Update local UI
    setChannels((prev) => {
      const updatedMessages = prev.daily_shared_idea.map((msg) =>
        msg.text === ideaText ? { ...msg, likes: data.likes } : msg
      );

      return {
        ...prev,
        daily_shared_idea: updatedMessages,
      };
    });

    // Mark as liked in session
    sessionStorage.setItem(
      'likedIdeas',
      JSON.stringify([...likedIdeas, ideaText])
    );
  } catch (err) {
    console.error('Error liking idea:', err);
  }
};

const handleComment = async (ideaText) => {
  const comment = prompt('Enter your comment:');
  if (!comment) return;

  try {
    const res = await fetch('http://localhost:5000/api/comment_idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ideaText, comment }),
    });

    const data = await res.json();
    if (data.error) {
      console.error(data.error);
      return;
    }

    // Update local UI
    setChannels((prev) => {
      const updatedMessages = prev.daily_shared_idea.map((msg) =>
        msg.text === ideaText ? { ...msg, comments: data.comments } : msg
      );

      return {
        ...prev,
        daily_shared_idea: updatedMessages,
      };
    });
  } catch (err) {
    console.error('Error adding comment:', err);
  }
};



  return (
    <div className="chat-window">
      <Header activeChannel={activeChannel}/>

      {/* Sidebar with channels */}
      <div className="channel-and-chat">
      <div className="channel-list">
        {Object.keys(channels).map((channel) => (
          <div
            key={channel}
            className={`channel-item ${activeChannel === channel ? 'active' : ''}`}
            onClick={() => handleChannelChange(channel)}
          >
            #{channel.charAt(0).toUpperCase() + channel.slice(1)}
          </div>
        ))}
      </div>

      <div className="message-chat">
      <MessageList
        messages={channels[activeChannel]}
        isLoading={isLoading}
        onLike={handleLike}
        onComment={handleComment}
        activeChannel={activeChannel}
         />
      {botMessageId !== null && (
        <div className="buttons">
          <button onClick={() => handleButtonClick('submit')}>Submit</button>
          <button onClick={() => handleButtonClick('regenerate')}>Regenerate</button>
        </div>
      )}
      <MessageInput onSendMessage={handleSendMessage} />
      </div>
      </div>
    </div>
  );
}

export default ChatWindow;
