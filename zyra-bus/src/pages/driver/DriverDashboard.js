import React from "react";
import Header from "../../components/Header";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Tracking from "../../components/Tracking";
import busData from "../../data/bus.json";
import FeedBack from "../../components/FeedBack";
import { Button } from "react-bootstrap";

function DriverDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  const bus = busData.busses.find((b) => b.busNo === user.busNo);

  return (
    <>
      <Header />
      <div className="container">
        <h2 className="mt-4">Welcome, {user.name}</h2>

        <div className="row mt-4">
          <div className="col-sm-6">
            <div className="card p-3 shadow h-20">
              <h6>Driver Name : {user.name}</h6>
              <h6>Assigned Bus : {user.busNo}</h6>
              <h6>Phone Number: {user.phone}</h6>
              <h6>
                Timing : Morning : {bus.arrivalTime} | Evening :{" "}
                {bus.depatureTime}{" "}
              </h6>
            </div>




            <div className="card p-3 mt-4 mb-4 shadow h-20">
              <h5>Bus Routes</h5>
              <div
                className="card p-3 mt-2"
                style={{ height: "250px", overflowY: "auto" }}
              >
                {bus.route.map((stop, index) => (
                  <div
                    key={index}
                    className="card p-2 mt-3"
                    style={{ backgroundColor: "blueviolet", color: "white" }}
                  >
                    <h6>
                      Stop {index + 1} : {stop}{" "}
                    </h6>
                  </div>
                ))}
              </div>
            </div>
            <div >
            <Link to="/leave">
              <Button variant="primary" className="mt-3">Leave Apply</Button>
            </Link>
            </div>



            

          </div>

        
          


















          <div className="col-sm-6">
            <Tracking />
            <FeedBack />
          </div>
        </div>
      </div>
    </>
  );
}

export default DriverDashboard;
