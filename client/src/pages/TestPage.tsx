import React, { useEffect, useState } from 'react';
import { getAllTests } from '../api';

type Test = {
  id: string;
  message: string;
  created_at: string;
};

export default function TestPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTests() {
      try {
        const data = await getAllTests();
        setTests(data);
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTests();
  }, []);

  if (loading) return <p>Loading tests...</p>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1>All Tests</h1>
      {tests.length > 0 ? (
        <ul>
          {tests.map((test) => (
            <li key={test.id}>
              <strong>{test.message}</strong> <br />
              <small>{new Date(test.created_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p>No tests found.</p>
      )}
    </div>
  );
}
