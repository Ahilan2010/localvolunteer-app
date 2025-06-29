import React from 'react';
import OpportunityCard from './OpportunityCard';
import './OpportunityList.css';

function OpportunityList({ opportunities, loading, onCardClick }) {
  return (
    <div className="opportunities-list">
      <div className="list-header">
        <h2>Available Opportunities</h2>
        <span className="count">{opportunities.length} found</span>
      </div>
      
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Finding volunteer opportunities near you...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="empty-state">
          <p>No opportunities found</p>
          <p>Try adjusting your search radius or interests</p>
        </div>
      ) : (
        <div className="opportunity-cards">
          {opportunities.map(opp => (
            <OpportunityCard 
              key={opp.id} 
              opportunity={opp}
              onClick={() => onCardClick(opp)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default OpportunityList;
