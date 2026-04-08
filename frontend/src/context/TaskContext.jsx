import React, { createContext, useContext, useState } from 'react';

const TaskContext = createContext();

export const useTask = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
  // 'none', 'merge', 'split', 'compress'
  const [currentTask, setCurrentTask] = useState('none');
  const [files, setFiles] = useState([]);
  
  return (
    <TaskContext.Provider value={{ currentTask, setCurrentTask, files, setFiles }}>
      {children}
    </TaskContext.Provider>
  );
};
