const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// MiddleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aq8mwv9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect();
    const userCollection = client.db("eduConnectDB").collection("users");
    const sessionCollection = client.db("eduConnectDB").collection("sessions");
    const materialsCollection = client.db("eduConnectDB").collection("materials");

    // Ensure the default admin user is created
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = await userCollection.findOne({ email: adminEmail });

    if (!adminUser) {
      const admin = {
        email: adminEmail,
        role: "admin",
       
      };
      await userCollection.insertOne(admin);
    } 

    // Users related API
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

   
    app.get('/users', async (req, res) => {
        const email = req.query.email;
        if (email) {
          const query = { email: email };
          const user = await userCollection.findOne(query);
          res.send(user);
        } else {
          const users = await userCollection.find().toArray();
          res.send(users);
        }
      });
      

    app.get('/searchUsers', async (req, res) => {
      const searchTerm = req.query.q.toLowerCase();
          const users = await userCollection.find({
              role: { $ne: 'admin' },
              $or: [
                  { name: { $regex: searchTerm, $options: 'i' } },
                  { email: { $regex: searchTerm, $options: 'i' } }
              ]
          }).toArray();
          res.send(users);
  });
  
      // update user role
      app.put('/users/:userId', async (req, res) => {
        const userId = req.params.userId;
        const { role } = req.body;
          const result = await userCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { role: role } }
          );
          res.send(result);
      });


    // Sessions related API
    app.post('/sessions', async (req, res) => {
      const session = req.body;
      const result = await sessionCollection.insertOne(session);
      res.send(result);
    });

  

    app.get('/sessionsByTutor/:tutorEmail', async (req, res) => {
      const tutorEmail = req.params.tutorEmail;
      const status = req.query.status;
      const query = { tutorEmail: tutorEmail };
      if (status) {
          query.status = status;
      }
      const sessions = await sessionCollection.find(query).toArray();
      res.send(sessions);
  });


  // materials posted by tutor
  app.post('/materials', async (req, res) =>{
    const item = req.body;
    const result = await materialsCollection.insertOne(item);
    res.send(result);
  });

   // materials show
  app.get('/materials/:email', async (req, res) => {
    const tutorEmail = req.params.email;
    const materials = await materialsCollection.find({ tutorEmail }).toArray();
    res.send(materials);
  });
  
  app.put('/materials/:id', async (req, res) => {
        const id = req.params.id;
        const materialData = req.body;
        const result = await materialsCollection.updateOne({ _id: new ObjectId(id) }, { $set: materialData });
        res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
  });

  // Delete material
  app.delete('/materials/:id', async (req, res) => {
        const id = req.params.id;
        const result = await materialsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
            res.status(200).json({ success: true, message: 'Material deleted successfully', deletedCount: result.deletedCount });
        }
});

    app.get('/sessions', async (req, res) => {
       
      const cursor = sessionCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    

    app.get('/sessions/:sessionId', async (req, res) => {
      const sessionId = req.params.sessionId;
        const session = await sessionCollection.findOne(
          {
             _id: new ObjectId(sessionId) 
          }
        );
          res.send(session); 
    });

    app.put('/updateSession/:sessionId', async (req, res) => {
      const sessionId = req.params.sessionId;
      const updateFields = req.body; 
    
        const sessionCollection = client.db("eduConnectDB").collection("sessions");
        const result = await sessionCollection.updateOne(
          { _id: new ObjectId(sessionId) },
          { $set: updateFields }
        );
        if (result.modifiedCount === 1) {
          res.status(200).json({ message: "Session updated successfully" });
        } else {
          res.status(404).json({ message: "Session not found or no changes were made" });
        }
    });



    app.get('/approveSession', async (req, res) => {
          const cursor = sessionCollection.find({ status: 'approved' });
          const result = await cursor.toArray();
          res.send(result);
    });


    app.get('/pending', async (req, res) => {

      const cursor = sessionCollection.find({ status: 'pending' });
      const result = await cursor.toArray();
      res.send(result);

    });




    app.put('/approveSession/:sessionId', async (req, res) => {
      const sessionId = req.params.sessionId;
      const { sessionType, amount } = req.body;
      const registrationFee = sessionType === 'paid' ? parseFloat(amount) : 0;
      
          const result = await sessionCollection.updateOne(
              { _id: new ObjectId(sessionId) },
              { $set: { status: 'approved', registrationFee } }
          );
          res.send(result);
      
    });



  //reject a session
  app.put('/rejectSession/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    const { rejectionReason, feedback } = req.body;

      const result = await sessionCollection.updateOne(
        { _id: new ObjectId(sessionId) },
        { $set: { status: 'rejected', rejectionReason, feedback } }
      );
      res.send(result);
  });

  app.put('/updateSession/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    const updateFields = req.body;
      const result = await sessionCollection.updateOne(
        { _id: new ObjectId(sessionId) },
        { $set: updateFields }
      );
      res.send(result);
  });

  app.delete('/deleteSession/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
      const result = await sessionCollection.deleteOne({ _id: new ObjectId(sessionId) });
      res.send(result);
  });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('EduConnect crud is running');
});

app.listen(port, () => {
  console.log(`EduConnect crud port, ${port}`);
});
