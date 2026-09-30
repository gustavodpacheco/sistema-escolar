import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Usuario extends Model {}

// `token_version` permite revogar tokens antigos: um JWT continua valido ate
// expirar, entao trocar a senha sem comparar a emissao do token deixaria uma sessao
// antiga aberta em outro dispositivo. Um contador nao depende de relogio.
Usuario.init({
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  senha: { type: DataTypes.STRING, allowNull: false },
  perfil: { type: DataTypes.ENUM('admin', 'professor', 'aluno'), allowNull: false, defaultValue: 'professor' },
  disciplinas: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  aluno_id: { type: DataTypes.INTEGER, allowNull: true, unique: true },
  token_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { sequelize, modelName: 'usuario', tableName: 'usuarios' });

export default Usuario;
