import { init, Ditto, TransportConfig, Logger } from "@dittolive/ditto";
import express from "express";
import fs from "fs";
import nconf from "nconf";
import { start } from "repl";
import { tak_chats } from "./tak_chats.js";
import { v4 as uuidv4 } from "uuid";
import os from "os";
import { createHash } from 'crypto';


let ditto;
let collection;
let transportConfig;
let identity;
let interval = 2000; // 1000ms or 1Hz
let counter = 0;
let to_chat = true;
let ATR_PORT = 5005;

Logger.enabled = true;
Logger.minimumLogLevel = "Info";

// Use config file to setup ditto auth...
nconf.argv().env().file({ file: "config.json" });

const getConfig = (key, fallback) => nconf.get(key) || fallback;
const asBoolean = (value) =>
  [true, "true", "True", "TRUE", "1", 1].includes(value);

const app = express();
const port = 3000;

let pythonProcess = null;

// Increase the limit to, for example, '50mb'
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.post("/model/insert/", async (req, res) => {
  console.log("Performing Insert...");
  const modelData = req.body; // The JSON payload

  const new_model = {
    ...modelData,
  };

  await ditto.store.execute(
    `INSERT INTO contact
        DOCUMENTS (:new_model)`,
    { new_model }
  );

  if (to_chat) {
    // Upload Contact Report to TAK Chat
    const contact_report = {
      room: "ditto",
      roomId: "ChatContact-Ditto",
      takAuthorCallsign: getConfig("info:name", "unknown"),
      siteId: "3307442499255136657",
      takUid: uuidv4(),
      takAuthorUid: getConfig("info:name", "unknown"),
      takAuthorLocation: "0.0,0.0,NaN,HAE,NaN,NaN",
      takAuthorType: "a-f-G",
      timeMillis: timeNow(),
      // msg: "vwDQiZZDetZkjmgUMA5K93PFKmDVKQ9Y0P9MQ5neLCBEXDFeyTY3HYd6MSSXOJtQ"
      msg: `\nConfidence: ${new_model["confidence"]}\n
      bbox: ${new_model["bbox"]}\n
      class: ${new_model["class"]}\n
      lat: ${new_model["lat"]}\n
      lon: ${new_model["long"]}`,
    };

    await ditto.store.execute(
      `INSERT INTO TAK_Chats
          DOCUMENTS (:contact_report)`,
      { contact_report }
    );

    console.log(new_model["image_path"])

    const attachmentID = hashFileSync(new_model["image_path"])

    const newAttachment = await ditto.store.newAttachment(
      `${new_model["image_path"]}`, { name: `${os.hostname()}-${attachmentID.slice(-5)}.jpeg` }
    );

    const thumbAttachment = await ditto.store.newAttachment(
      `${new_model["thumb_path"]}`, { name: `${os.hostname()}-${attachmentID.slice(-5)}.jpeg` }
    );

    // Create a new document object and store the attachment on the `my_attachment` field.
    const newDocument = {
      _id: attachmentID,
      tak_file: newAttachment,
      contentType: null,
      siteId: "3307442499255136657",
      hash: attachmentID,
      size: parseFloat(new_model["image_size"]) + 0.0,
      mime: "image/jpeg",
      takAuthorCallsign: getConfig("info:name", "unknown"),
      takUid: uuidv4(),
      takAuthorUid: getConfig("info:name", "unknown"),
      takAuthorLocation: "0.0,0.0,NaN,HAE,NaN,NaN",
      takAuthorType: "a-f-G-U-C",
      timeMillis: timeNow(),
      isRemoved: false,
      name: `${os.hostname()}-${attachmentID.slice(-5)}.jpeg`
    };

    // Insert the new document into the collection
    // Note that the `my_attachment` field needs to be defined as an ATTACHMENT data type
    await ditto.store.execute(
      `
      INSERT INTO COLLECTION TAK_Attachments (tak_file ATTACHMENT)
      DOCUMENTS (:newDocument)`,
      { newDocument }
    );

    const thumbnailDocument = {
      _id: attachmentID,
      thumbnail_file: thumbAttachment,
      thumbnail_size: parseFloat(new_model["thumb_size"]) + 0.0,
    }

    await ditto.store.execute(
      `
        INSERT INTO COLLECTION TAK_Attachments (thumbnail_file ATTACHMENT)
        DOCUMENTS (:thumbnailDocument)
        ON ID CONFLICT DO UPDATE`,
        { thumbnailDocument }
    )
  }

  // Respond to the request indicating success
  res.status(201).send({ message: "Report inserted successfully" });
});

// Start ATR Function
export async function startATR() {
  console.log("Starting ATR...");

  const start_message = {
    _id: "status",
    status: "start",
  };

  console.log();

  await ditto.store.execute(
    `INSERT INTO contact
          DOCUMENTS (:start_message)
          ON ID CONFLICT DO UPDATE`,
    { start_message }
  );

  console.log("Got HEre!");

  // Optionally return a value or confirmation
  return { message: "Started successfully" };
}

// Start ATR API
app.post("/model/start/", async (req, res) => {
  try {
    const result = await startATR();
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "An error occurred" });
  }
});

export async function stopATR() {
  console.log("Stopping ATR...");

  ////
  // Send Stop
  ////
  const stop_message = {
    _id: "status",
    status: "stop",
  };

  await ditto.store.execute(
    `INSERT INTO contact
          DOCUMENTS (:stop_message)
          ON ID CONFLICT DO UPDATE`,
    { stop_message }
  );

  return { message: "Stopped successfully" };
}

app.post("/model/stop/", async (req, res) => {
  try {
    const result = await stopATR();
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "An error occorred" });
  }
  // Respond to the request indicating success
});

app.post("/model/update/:id", async (req, res) => {
  console.log("Performing Update...");
  const id = req.params.id; // The ID from the URL
  const updates = req.body; // The JSON payload with updates

  const update_doc = {
    _id: id,
    ...updates,
  };

  // Here, you would update the existing model in your Ditto store
  // Example (adjust according to your actual data structure and requirements):
  // await ditto.store.execute(
  //     `INSERT INTO model
  //     DOCUMENTS (:update_doc)
  //     ON ID CONFLICT DO UPDATE`,
  //     { update_doc }
  // )

  const setString = Object.entries(updates)
    .map(([key, value]) => `${key} = '${value}'`)
    .join(", ");

  console.log(setString);

  await ditto.store.execute(
    `UPDATE model
        SET ${setString}
        WHERE _id = (:id)`
  );

  const get_data = await ditto.store.execute(
    `SELECT * 
        FROM model 
        WHERE _id = 'test5'`,
    null
  );

  let changeHandler = get_data.items.forEach((element) => {
    fs.writeFile("test.json", element.jsonString(), function (err) {
      if (err) {
        console.log(err);
      }
    });
  });

  // Respond to the request
  res.status(201).send({ message: "Model updated successfully", id: id });
});

let liveQuery;
let statusQuery;
let statusSub;
let tasks = [];
let models = [];
let subscription;

async function main() {
  await init();

  let updateCnt = 1;

  // This is technically creating a big peer instance?
  // ditto = new Ditto({
  //     type: 'onlinePlayground',
  //     appID: '71add2bb-0c43-4d8e-a619-bfa29f93a225',
  //     token: '24b762b8-4161-4663-b52a-e216a816fdc0'
  // });

  const config = {
    APP_ID: getConfig("ditto:app-id", ""),
    APP_TOKEN: getConfig("ditto:app-token", ""),
    OFFLINE_TOKEN: getConfig("ditto:offline-token", ""),
    SHARED_KEY: getConfig("ditto:shared-key", ""),
    USE_CLOUD: asBoolean(getConfig("ditto:use-cloud", true)),
    USE_LAN: asBoolean(getConfig("ditto:use-lan", true)),
    USE_BLE: asBoolean(getConfig("ditto:use-ble", true)),
    BPA_URL: getConfig("ditto:bpa-url", ""),
  };

  console.log(config.APP_ID);
  console.log(config.APP_TOKEN);
  console.log(config.OFFLINE_TOKEN);
  console.log(config.SHARED_KEY);
  console.log(config.USE_CLOUD);
  console.log(config.USE_LAN);
  console.log(config.USE_BLE);
  console.log(config.BPA_URL);

  // We're testing BLE here
  transportConfig = new TransportConfig();
  transportConfig.peerToPeer.bluetoothLE.isEnabled = config.USE_BLE;
  transportConfig.peerToPeer.lan.isEnabled = config.USE_LAN;

  // Start the Express server
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  const authHandler = {
    authenticationRequired: async function (authenticator) {
      await authenticator.loginWithToken("full_access", "dummy-provider");
      console.log(`Login requested`);
    },
    authenticationExpiringSoon: function (authenticator, secondsRemaining) {
      console.log(`Auth token expiring in ${secondsRemaining} seconds`);
    },
  };

  // if (config.BPA_URL == "NA") {
  //   identity = {
  //     type: "sharedKey",
  //     appID: config.APP_ID,
  //     sharedKey: config.SHARED_KEY,
  //   };
  // } else {
  //   identity = {
  //     type: "onlineWithAuthentication",
  //     appID: config.APP_ID,
  //     enableDittoCloudSync: false,
  //     authHandler: authHandler,
  //     customAuthURL: config.BPA_URL,
  //   };
  // }

  // ditto = new Ditto(identity, "./ditto");
  ditto = new Ditto({ type: 'onlinePlayground', appID: config.APP_ID, token: config.APP_TOKEN})
  ditto.deviceName = `${getConfig("info:name", os.hostname())} - ATR`

  if (config.BPA_URL == "NA") {
    ditto.setOfflineOnlyLicenseToken(config.OFFLINE_TOKEN);
  }
  const transportConditionsObserver = ditto.observeTransportConditions(
    (condition, source) => {
      if (condition === "BLEDisabled") {
        console.log("BLE disabled");
      } else if (condition === "NoBLECentralPermission") {
        console.log("Permission missing for BLE");
      } else if (condition === "NoBLEPeripheralPermission") {
        console.log("Permissions missing for BLE");
      }
    }
  );

  ditto.setTransportConfig(transportConfig);

  ditto.startSync();

  const liveQueryCallback = (docs, event) => {
    // store documents that match out query in the local tasks object
    console.log("Updating Tasks...");
    console.log(new Date().toISOString());
    // models = docs;
    // console.log(models);
    // const model_data = models.map((model) => model.value);
    // const obj = Object.fromEntries(model_data);
    // fs.writeFile("test.txt", obj, function(err) {
    //     if (err) {
    //         console.log(err);
    //     }
    // });
  };

  const statusQueryCallback = (docs, event) => {
    console.log("statusQueryCallback...");

    console.log(docs.value);

    // Assuming `docs.value['status']` contains either 'start' or 'stop'
    if (docs.value["status"] == "start") {
      console.log("Starting ATR...");

      console.log(`http://127.0.0.1:${ATR_PORT}/run`);
      // Use fetch to call the /run endpoint
      fetch(`http://127.0.0.1:${ATR_PORT}/run`, {
        method: "GET",
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data.message); // Log the response from the Flask app
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    } else if (docs.value["status"] == "stop") {
      console.log("Stopping ATR...");

      // Use fetch to call the /stop endpoint
      fetch(`http://127.0.0.1:${ATR_PORT}/stop`, {
        method: "GET",
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data.message); // Log the response from the Flask app
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    } else {
      console.log("Unknown status...");
    }

    // let changeHandler =
    //     get_data.items.forEach((element) => {
    //         console.log(element.jsonString())
    //     })
  };

  liveQuery = ditto.store
    .collection("contact")
    .findAll()
    .observeLocal(liveQueryCallback);

  models = await ditto.store.collection("contact").findAll();

  subscription = ditto.store.collection("contact").findAll().subscribe();

  statusQuery = ditto.store
    .collection("contact")
    .findByID("status")
    .observeLocal(statusQueryCallback);

  statusSub = ditto.store.collection("contact").findByID("status").subscribe();

  tak_chats(ditto);
}

main();

function timeNow() {
  //make it a Double
  return Date.now() + 0.001;
}

// Function to calculate SHA-256 hash of a file synchronously
function hashFileSync(filePath) {
  // Read file content synchronously
  const fileBuffer = fs.readFileSync(filePath);
  
  // Create a SHA-256 hash instance
  const hash = createHash('sha256');
  
  // Update hash with file content and digest it in hexadecimal format
  const hashSum = hash.update(fileBuffer).digest('hex');
  
  return hashSum;
}
