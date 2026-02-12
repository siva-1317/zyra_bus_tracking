import React from 'react'
import attendanceData from '../data/attendance.json'

function Attendance() {

    const user = JSON.parse(localStorage.getItem("user"));
    const student = attendanceData.students.find(
    s => s.id === user.id
  );

    
  const records = student?.attendance || [];

  const present = records.filter(r => r.status === "Present").length;
  const percentage = records.length
    ? Math.round((present / records.length) * 100): 0;


  return (
    <div className='card p-3 shadow mt-3 mb-3' style={{height:"600px"}}>
                    <h5 className='p-4' style={{background:"blueviolet", color:"white"}}>Attendance : {percentage}%</h5>
                     {records.length === 0 && (
        <p className="text-muted">No attendance records</p>
      )}


                    <div className='card p-3 mt-3 shadow overflow-auto'>
                    {records.map((item,index)=>{
                        return(
                        <div key = {index} className='card m-3 p-3 shadow'>
                        <h6>Date:{item.date}</h6>
                        <h6>Session: {item.session}</h6>
                        <h6 >Status: <span style={{ color: item.status === "Present" ? "green" : "red" }}>{item.status}</span></h6>
                        </div>
                        )
                    })}
                    </div>
                    
                </div>
  )
}

export default Attendance