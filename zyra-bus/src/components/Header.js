import React from "react";
import { Container, Navbar } from "react-bootstrap";

function Header() {
  return (
    <>
      <style>{`
        .app-header {
          background: linear-gradient(135deg, #7b2cbf, #5a189a);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow:
            0 12px 24px rgba(36, 11, 70, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow:
            inset 2px 2px 6px rgba(255, 255, 255, 0.18),
            inset -2px -2px 6px rgba(0, 0, 0, 0.15);
        }

        .brand-title {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.4px;
          margin: 0;
        }

        .brand-accent {
          color: #ffd166;
        }

        .brand-sub {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          letter-spacing: 0.3px;
        }

        .brand-divider {
          width: 1px;
          height: 26px;
          background: linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.5), rgba(255,255,255,0.1));
        }
      `}</style>

      <Navbar className="app-header" expand="lg">
        <Container className="py-2">
          <Navbar.Brand href="#" className="brand-wrap">
            <h1 className="brand-title">
              Zyra<span className="brand-accent">.</span>
            </h1>
            <div className="brand-divider" />
            <p className="brand-sub">Track your bus</p>
          </Navbar.Brand>
        </Container>
      </Navbar>
    </>
  );
}

export default Header;
