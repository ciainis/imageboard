const express = require('express');
const app = express();

const s3 = require('./s3');
const config = require('./config');

const bodyParser = require('body-parser');

var multer = require('multer');
var uidSafe = require('uid-safe');
var path = require('path');

var diskStorage = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, __dirname + '/uploads');
  },
  filename: function(req, file, callback) {
    uidSafe(24).then(function(uid) {
      callback(null, uid + path.extname(file.originalname));
    });
  }
});

var uploader = multer({
  storage: diskStorage,
  limits: {
    fileSize: 2097152
  }
});

const db = require('./db.js');

app.use(bodyParser.json());

app.use(express.static('./public'));

app.get('/images', (req, res) => {
  db.getImages().then(response => {
    res.json(response.rows);
  });
});

app.post('/upload', uploader.single('file'), s3.upload, (req, res) => {
  db.addImage(
    config.s3Url + req.file.filename,
    req.body.username,
    req.body.title,
    req.body.description
  )
    .then(({ rows }) => {
      res.json(rows[0]);
    })
    .catch(err => {
      console.log(err);
      res.status(500).send({ error: 'Something failed!' });
    });
});

app.get('/get-image/:imageid', (req, res) => {
  db.getImage(req.params.imageid)
    .then(response => {
      res.json(response.rows);
    })
    .catch(err => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.get('/images/more/:imageid', (req, res) => {
  db.getMoreImages(req.params.imageid)
    .then(response => {
      res.json(response.rows);
    })
    .catch(err => {
      console.log('error: ', err);
      res.status(500).send(err);
    });
});

app.get('/get-comments/:imageid', (req, res) => {
  db.getComments(req.params.imageid)
    .then(response => {
      res.json(response.rows);
    })
    .catch(err => console.log(err));
});

app.post('/comment/add', (req, res) => {
  db.addComment(req.body.username, req.body.comment, req.body.imageid)
    .then(response => {
      res.json(response.rows);
    })
    .catch(err => {
      console.log(err);
      res.status(500).send({ error: 'Something failed!' });
    });
});

app.listen(process.env.PORT || 8080, () => console.log('listening!'));
