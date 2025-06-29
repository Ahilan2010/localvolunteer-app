import React from 'react';
import './OpportunityCard.css';

function OpportunityCard({ opportunity, onClick }) {
  return (
    <div className="opportunity-card" onClick={onClick}>
      <div className="card-header">
        <h3>{opportunity.title}</h3>
      </div>
      
      <p className="organization">{opportunity.organization}</p>
      <p className="description">{opportunity.description}</p>
      
      <div className="card-footer">
        <span className="location">📍 {opportunity.location}</span>
        {opportunity.date && <span className="date">📅 {opportunity.date}</span>}
      </div>
      
      <a 
        href={opportunity.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="view-details"
        onClick={(e) => e.stopPropagation()}
      >
        View Details →
      </a>
    </div>
  );
}

export default OpportunityCard;