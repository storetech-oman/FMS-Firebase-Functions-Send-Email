const path = require("path");
const express = require("express");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const cors = require("cors");
const nodemailer = require("nodemailer");

// initialize app and set port
const app = express();
const port = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// read firebase configurations from service
const FIREBASE_CONFIG = require(path.join(__dirname, "service-account-key"));

admin.initializeApp({
  credential: admin.credential.cert(FIREBASE_CONFIG),
  databaseURL: "https://full-maintenance-system.firebaseio.com",
});

// firebase instances
const db = admin.firestore();

// default route
app.get('/', (req, res) => {
  res.json({
    status: "success",
    message: "Welcome To FMS API"
  });
});

app.post('/send-email', async (req, res) => {

  if (typeof req.body.referenceNumber === "undefined" ||
    typeof req.body.name === "undefined" ||
    typeof req.body.email === "undefined" ||
    typeof req.body.phone === "undefined" ||
    typeof req.body.siteId === "undefined" ||
    typeof req.body.location === "undefined" ||
    typeof req.body.date === "undefined" ||
    typeof req.body.issue === "undefined") {
    res.status(400).json({
      status: "failed",
      message: "Bad Request"
    });
  }

  try {

    // get app configurations
    const configurations = await db.collection("configurations").doc("default-configurations").get();

    // check for consfiguration data
    if (typeof configurations.data() === "undefined") {
      res.status(400).json({
        status: "failed",
        message: "Server Error"
      });
    }

    // send email
    await sendEmail(configurations.data(), req.body);

    // send status to user
    res.status(200).json({
      status: "success",
      message: "Email has been sent"
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error
    });
  }
});

async function sendEmail(configurations, request) {

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: configurations.emailHost,
    port: configurations.emailPort,
    auth: {
      user: configurations.senderEmailUser, // generated ethereal user
      pass: configurations.senderEmailPass, // generated ethereal password
    },
    tls: {
      rejectUnauthorized: configurations.rejectUnauthorized
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: `"FMS" ${configurations.senderEmailUser}`, // sender address
    to: configurations.recipientEmail, // list of receivers
    subject: configurations.emailSubject, // Subject line
    html: `<table>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Reference Number :
      </th>
      <td>${request.referenceNumber}</td>
    </tr>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Name :
      </th>
      <td>${request.name}</td>
    </tr>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Email :
      </th>
      <td>${request.email}</td>
    </tr>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Phone :
      </th>
      <td>${request.phone}</td>
    </tr>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Site Id :
      </th>
      <td>${request.siteId}</td>
    </tr>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Location :
      </th>
      <td>${request.location}</td>
    </tr>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Issue :
      </th>
      <td>${request.issue}</td>
    </tr>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Other Issues :
      </th>
      <td>${request.otherIssues}</td>
    </tr>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Date :
      </th>
      <td>${request.date}</td>
    </tr>
    <tr>
      <th style="width: 150px; text-align: end; padding-right: 10px">
        Image Url :
      </th>
      <td>${request.imageUrl}</td>
    </tr>
  </table>`, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

// serve app locally
// app.listen(port, () => console.log(`Listening on port ${port}`));

// serve app using firebase functions
exports.app = functions.https.onRequest(app);
