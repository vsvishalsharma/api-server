// Import required packages
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Constants
const INTERCOM_API_URL = 'https://api.intercom.io';
const INTERCOM_VERSION = '2.9';

// Environment variables
const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;
const TICKET_TYPE_ID = process.env.TICKET_TYPE_ID || '1'; // Default to 1 as per docs

// Configure axios defaults for Intercom API
const intercomClient = axios.create({
  baseURL: INTERCOM_API_URL,
  headers: {
    'Intercom-Version': INTERCOM_VERSION,
    'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// API endpoint to create a ticket
// API endpoint to create a ticket
app.post('/api/tickets', async (req, res) => {
    try {
      console.log('Received ticket creation request:', req.body);
      const { email, priority, company_size } = req.body;
      
      if (!email) {
        console.log('Email is required but not provided');
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Create ticket payload
      const ticketPayload = {
        contacts: [{ email }],
        ticket_type_id: TICKET_TYPE_ID
      };
      
      console.log('Sending request to Intercom:', ticketPayload);
      // Create the ticket
      const ticketResponse = await intercomClient.post('/tickets', ticketPayload);
      const ticket = ticketResponse.data;
      
      console.log('Received response from Intercom:', ticket);
      res.status(201).json(ticket);
    } catch (error) {
      console.error('Error creating ticket:', error.response?.data || error.message);
      console.error('Full error:', error);
      res.status(error.response?.status || 500).json({
        error: error.response?.data || 'Failed to create ticket'
      });
    }
  });

// API endpoint to create a new ticket type (one-time setup)
app.post('/api/ticket-types', async (req, res) => {
  try {
    const { name, icon = '🎟️', isInternal = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Ticket type name is required' });
    }
    
    const ticketTypePayload = {
      name,
      icon,
      is_internal: isInternal
    };
    
    const response = await intercomClient.post('/ticket_types', ticketTypePayload);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error creating ticket type:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to create ticket type'
    });
  }
});

// API endpoint to add attributes to a ticket type
app.post('/api/ticket-types/:typeId/attributes', async (req, res) => {
  try {
    const { typeId } = req.params;
    const { 
      name, 
      dataType, 
      listItems = '',
      requiredToCreate = true,
      requiredToCreateForContacts = false,
      visibleOnCreate = true,
      visibleToContacts = false
    } = req.body;
    
    if (!name || !dataType) {
      return res.status(400).json({ error: 'Name and data type are required' });
    }
    
    const attributePayload = {
      name,
      data_type: dataType,
      required_to_create: requiredToCreate,
      required_to_create_for_contacts: requiredToCreateForContacts,
      visible_on_create: visibleOnCreate,
      visible_to_contacts: visibleToContacts
    };
    
    // Add list items if provided and data type is list
    if (dataType === 'list' && listItems) {
      attributePayload.list_items = listItems;
    }
    
    const response = await intercomClient.post(`/ticket_types/${typeId}/attributes`, attributePayload);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error creating attribute:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to create attribute'
    });
  }
});

// Simple HTML form for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Create Intercom Ticket</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        form { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        input, select { width: 100%; padding: 8px; margin-bottom: 15px; }
        button { background: #0275d8; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>Create Intercom Ticket</h1>
      <form id="ticketForm">
        <div>
          <label for="email">Customer Email:</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div>
          <label for="priority">Priority:</label>
          <select id="priority" name="priority">
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
        </div>
        <button type="submit">Create Ticket</button>
      </form>
      <div id="response" style="margin-top: 20px;"></div>

      <script>
        document.getElementById('ticketForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const priority = document.getElementById('priority').value;
          
          try {
            const response = await fetch('/api/tickets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email,
                ticketAttributes: {
                  priority
                }
              })
            });
            
            const data = await response.json();
            document.getElementById('response').innerHTML = 
              <pre>${JSON.stringify(data, null, 2)}</pre>;
          } catch (error) {
            document.getElementById('response').innerHTML = 
              <p style="color: red;">Error: ${error.message}</p>;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});