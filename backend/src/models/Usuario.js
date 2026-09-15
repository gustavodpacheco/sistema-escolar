import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Usuario extends Model {}

Usuario.init({
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  senha: { type: DataTypes.STRING, allowNull: false },
  perfil: { type: DataTypes.ENUM('admin', 'professor', 'aluno'), allowNull: false, defaultValue: 'professor' },
  disciplinas: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
}, { sequelize, modelName: 'usuario', tableName: 'usuarios' });

export default Usuario;
