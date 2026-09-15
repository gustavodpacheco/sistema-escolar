import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Frequencia extends Model {}

Frequencia.init({
  aluno_id: { type: DataTypes.INTEGER, allowNull: false },
  turma_id: { type: DataTypes.INTEGER, allowNull: true },
  disciplina: { type: DataTypes.STRING, allowNull: false },
  data_aula: { type: DataTypes.DATEONLY, allowNull: false },
  plano_aula: { type: DataTypes.STRING, allowNull: true },
  numero_aula: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  presente: { type: DataTypes.BOOLEAN, allowNull: false },
}, { sequelize, modelName: 'frequencia', tableName: 'frequencias' });

export default Frequencia;
