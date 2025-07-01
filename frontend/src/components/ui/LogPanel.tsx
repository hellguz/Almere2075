import React, { useEffect, useRef } from 'react';
import type { LogMessage } from '../../types';
import './LogPanel.css';

interface LogPanelProps {
    messages: LogMessage[];
    isVisible: boolean;
}

const LogPanel: React.FC<LogPanelProps> = ({ messages, isVisible }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`process-log-wrapper ${isVisible ? 'visible' : ''}`}>
      <div className="log-header">PROCESS LOG</div>
      <div className="log-content">
        {messages.map((msg, i) => (
          <p key={i} className={`log-message ${msg.type || 'info'}`}>
            <span>{msg.time}</span>
            <span>{msg.text}</span>
          </p>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default LogPanel;

