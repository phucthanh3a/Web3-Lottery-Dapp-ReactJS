import React from 'react';
import Home from './Home';
import PickWinner from './PickWinner';
import {BrowserRouter, Routes, Route, Link} from 'react-router-dom';
import './App.css';

function App() {
  return(
    <BrowserRouter>
    <div>
      {/* Navigation bar */}
      <nav>
        <ul>
          <li>
            {/* Link to the Home page */}
            <Link to="/">Home</Link>
          </li>
          <li>
            {/* Link to the PickWinner page */}
            <Link to="/PickWinner">PickWinner</Link>
          </li>
        </ul>
      </nav>

      {/* Define routes for different pages */}
      <Routes>
        {/* Route for the PickWinner page */}
        <Route path="/PickWinner" element={<PickWinner />}></Route>
        {/* Route for the Home page (default route) */}
        <Route path="/" element={<Home />}></Route>
      </Routes>
    </div>
    </BrowserRouter>
  )
}

export default App;
