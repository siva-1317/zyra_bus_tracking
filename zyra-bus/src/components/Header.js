import React from "react";
import { Container, Navbar } from "react-bootstrap";

function Header() {
  return (

    <Navbar style={{backgroundColor:"blueviolet"}} variant="dark" expand="lg">
      <Container>
        <Navbar.Brand href="#" style={{color:"white", fontSize:"20px"}}><span style={{fontSize:"50px"}}>Zyra</span>{" "}track your bus</Navbar.Brand>    

      </Container>
    </Navbar>




  );
}

export default Header;
