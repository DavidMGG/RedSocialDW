const express = require('express');
const multer = require('multer');
const bucket = require('./firebase'); // Archivo de configuración de Firebase
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

const app = express();
const port = 3000;

// Configuración del middleware de multer para almacenar archivos en memoria
const upload = multer({ storage: multer.memoryStorage() });

// Configurar el motor de plantillas EJS
app.set('view engine', 'ejs');

// Configurar la sesión
app.use(session({
  secret: 'mi_secreto_super_seguro_y_aleatorio',
  resave: false,
  saveUninitialized: true,
}));

// Inicializar passport
app.use(passport.initialize());
app.use(passport.session());

// Serialización del usuario (para mantener la sesión)
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Configurar la estrategia de Google
passport.use(new GoogleStrategy({
    clientID: '208094487655-bfnpkr381jl076fsr1gnvat607s5jgfp.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:3000/auth/google/callback',
  },
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }
));

// Middleware para asegurarse de que el usuario esté autenticado
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// Rutas
app.get('/', (req, res) => {
  res.render('index');
});

// Ruta para iniciar sesión con Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Ruta de retorno después de autenticarse con Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/upload');
  }
);

// Ruta protegida para subir imágenes
app.get('/upload', ensureAuthenticated, (req, res) => {
  res.render('upload', { user: req.user });
});

// Ruta para manejar la carga de archivos
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No se subió ningún archivo');
  }

  // Subir el archivo a Firebase Storage
  const blob = bucket.file(req.file.originalname);
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: req.file.mimetype
    }
  });

  blobStream.on('error', (err) => {
    console.log(err);
    res.status(500).send('Error al subir archivo');
  });

  blobStream.on('finish', () => {
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    res.status(200).send(`Subida exitosa! URL de la imagen: ${publicUrl}`);
  });

  blobStream.end(req.file.buffer);
});

// Ruta protegida para ver imágenes
app.get('/images', ensureAuthenticated, async (req, res) => {
  const [files] = await bucket.getFiles();
  const imageUrls = files.map(file => `https://storage.googleapis.com/${bucket.name}/${file.name}`);
  res.render('images', { imageUrls, user: req.user });
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
