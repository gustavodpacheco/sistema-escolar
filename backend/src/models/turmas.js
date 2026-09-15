import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Turma extends Model {}

Turma.init(
  {
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },

    serie: {
      type: DataTypes.STRING,
      allowNull: false
    },

    ano: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'turma',
    tableName: 'turmas'
  }
);

export default Turma;