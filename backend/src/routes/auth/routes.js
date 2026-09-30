import express from 'express';
import { login } from '../../controllers/authController.js';
import { limiteDeLogin } from '../../middlewares/limites.js';
const routes = express.Router();
// Missao 006: cota de tentativas por IP para conter forca bruta.
routes.post('/login', limiteDeLogin, login);
export default routes;
