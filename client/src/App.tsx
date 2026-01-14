import './App.css';
import TestPage from './pages/TestPage/TestPage';
import TestNavBar from './components/TestNavBar/TestNavBar';

function App() {
  return (
    <div className="App">
      {/* toDo: remove nav bar */}
      <TestNavBar />
      <h1>Welcome to Crayons to Classrooms!!!</h1>
      <TestPage />
    </div>
  );
}

export default App;
