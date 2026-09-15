import Aluno from '../models/Aluno.js';
import Turma from '../models/turmas.js';
import Nota from '../models/Nota.js';
import Frequencia from '../models/Frequencia.js';

Turma.hasMany(Aluno, { foreignKey: 'turma_id' });
Aluno.belongsTo(Turma, { foreignKey: 'turma_id' });
Aluno.hasMany(Nota, { foreignKey: 'aluno_id' });
Nota.belongsTo(Aluno, { foreignKey: 'aluno_id' });
Aluno.hasMany(Frequencia, { foreignKey: 'aluno_id' });
Frequencia.belongsTo(Aluno, { foreignKey: 'aluno_id' });
