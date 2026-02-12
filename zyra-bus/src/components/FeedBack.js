import React from 'react'
import { Card, Form, Button } from "react-bootstrap";
import { useState } from "react";

function FeedBack() {
    const [feedback, setFeedback] = useState("");
  return (
    <Card className="p-3 shadow mt-3">

      <h5>Feedback</h5>

      <Form.Group className="mt-2">
        <Form.Control
          as="textarea"
          rows={3}
          placeholder="Enter your feedback..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </Form.Group>

      <Button
        className="mt-3" style={{backgroundColor:"blueviolet"}}
        onClick={() => alert("Feedback Submitted")}
      >
        Submit
      </Button>

    </Card>
  )
}

export default FeedBack