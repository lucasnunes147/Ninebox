const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

app.use(express.static(path.join(__dirname, '../')));

const db = mysql.createConnection({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'ninebox',
  port: process.env.MYSQLPORT || 3306,
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no banco de dados: ', err);
    return;
  }
  console.log('Conectado ao banco de dados');
});

// Rota de login
app.post('/login', (req, res) => {
  const { email, password, accessType } = req.body;

  if (!email || !password || !accessType) {
    return res.status(400).json({ message: 'Email, senha e tipo de acesso são obrigatórios.' });
  }

  const query = 'SELECT * FROM usuarios WHERE (email = ? OR cpf = ?)';

  db.execute(query, [email, email], (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados: ', err);
      return res.status(500).json({ message: 'Erro no servidor' });
    }

    if (results.length > 0) {
      const user = results[0];

      console.log('Senha armazenada no banco de dados (texto):', user.senha);
      console.log('Senha recebida para comparação:', password);

      if (user.senha === password) {
        // Verifica o tipo de usuário
        if (user.tipo_usuario === accessType) {
          return res.status(200).json({
            message: 'Login bem-sucedido',
            tipo: user.tipo_usuario,
          });
        } else {
          return res.status(403).json({ message: 'Acesso inválido para este tipo de usuário.' });
        }
      } else {
        return res.status(401).json({ message: 'Senha incorreta.' });
      }
    } else {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }
  });
});

// Rota para listar todos os avaliados
app.get('/avaliado', (req, res) => {
  const query = 'SELECT cpf, nome, genero, dataNascimento, empresa, gestor, email FROM avaliado';

  db.execute(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar os avaliados: ', err);
      return res.status(500).json({ message: 'Erro ao consultar os avaliados' });
    }

    console.log('Resultados da consulta: ', results);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Nenhum avaliado encontrado.' });
    }

    res.status(200).json(results);
  });
});

// Criação da tabela de competencia interligado com o Banco e o Session Storage da pagina 5

app.post('/salvar_competencia', (req, res) => {
  const { competencia, descricao, ideal, bom, mediano, a_melhorar } = req.body;

  if (!competencia || !descricao || !ideal || !bom || !mediano || !a_melhorar) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  const query = 'INSERT INTO competencias (competencia, descricao, ideal, bom, mediano, a_melhorar) VALUES (?, ?, ?, ?, ?, ?)';

  db.execute(query, [competencia, descricao, ideal, bom, mediano, a_melhorar], (err, result) => {
    if (err) {
      console.error('Erro ao inserir competência:', err);
      return res.status(500).json({ message: 'Erro ao salvar a competência.' });
    }
    res.status(201).json({ message: 'Competência salva com sucesso!' });
  });
});

// Criação de um novo avaliado
app.post('/avaliado', (req, res) => {
  const { nome, cpf, genero, dataNascimento, empresa, gestor, email } = req.body;

  if (!nome || !cpf || !genero || !dataNascimento || !empresa || !gestor || !email) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  const checkQuery = 'SELECT * FROM avaliado WHERE cpf = ?';
  db.execute(checkQuery, [cpf], (err, results) => {
    if (err) {
      console.error('Erro ao verificar o CPF: ', err);
      return res.status(500).json({ message: 'Erro no servidor ao verificar o CPF' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'Este CPF já está cadastrado.' });
    }

    const insertQuery = 'INSERT INTO avaliado (nome, cpf, genero, dataNascimento, empresa, gestor, email) VALUES (?, ?, ?, ?, ?, ?, ?)';
    console.log('Consultando a inserção:', insertQuery, [nome, cpf, genero, dataNascimento, empresa, gestor, email]);

    db.execute(insertQuery, [nome, cpf, genero, dataNascimento, empresa, gestor, email], (err, result) => {
      if (err) {
        console.error('Erro ao inserir o avaliado: ', err.sqlMessage || err.message); // Mostra o erro do SQL
        return res.status(500).json({ message: err.sqlMessage || err.message }); // Envia o erro real para o front-end
      }
      res.status(201).json({
        message: 'Avaliado criado com sucesso!',
        avaliado: {
          id: result.insertId,
          nome,
          cpf,
          genero,
          dataNascimento,
          empresa,
          gestor,
          email
        }
      });
    });
  });
});

// Rota para consultar os dados de um avaliado específico
app.get('/avaliado/:id', (req, res) => {
  const id = req.params.id;

  const query = 'SELECT nome, empresa, gestor FROM avaliado WHERE id = ?';

  db.execute(query, [id], (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados: ', err);
      return res.status(500).json({ message: 'Erro ao consultar o banco de dados' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Avaliado não encontrado.' });
    }

    res.status(200).json(results[0]);
  });
});

// Rota para deletar um avaliado
app.delete('/avaliado/:id', (req, res) => {
  const id = req.params.id;

  const query = 'DELETE FROM avaliado WHERE id = ?';

  db.execute(query, [id], (err, result) => {
    if (err) {
      console.error('Erro ao remover o avaliado: ', err);
      return res.status(500).json({ message: 'Erro ao remover o avaliado' });
    }

    res.status(200).json({ message: 'Avaliado removido com sucesso!' });
  });
});

// Rota para listar todas as competência
app.get('/competencias', (req, res) => {
  const query = 'SELECT id, competencia, descricao, ideal, bom, mediano, a_melhorar FROM competencias';

  db.execute(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar as competencias: ', err);
      return res.status(500).json({ message: 'Erro ao consultar as competencias' });
    }

    console.log('Resultados da consulta: ', results);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Nenhuma competencia encontrada.' });
    }

    res.status(200).json(results);
  });
});

// Rota para consultar os dados de uma competência específica
app.get('/competencia/:id', (req, res) => {
  const id = req.params.id;

 const query = 'SELECT id, competencia, descricao, ideal, bom, mediano, a_melhorar FROM competencias WHERE id = ?';

  db.execute(query, [id], (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados: ', err);
      return res.status(500).json({ message: 'Erro ao consultar o banco de dados' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'competencia não encontrada.' });
    }

    res.status(200).json(results[0]);
  });
});
app.post('/salvarAvaliacao', (req, res) => {
  const { nomeAvaliacao, empresa, dataInicio, dataFim, descricao } = req.body;

  // Inserir dados no banco de dados
  const query = 'INSERT INTO avaliacoes (nomeAvaliacao, empresa, dataInicio, dataFim, descricao) VALUES (?, ?, ?, ?, ?)';
  const values = [nomeAvaliacao, empresa, dataInicio, dataFim, descricao];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao salvar a avaliação: ', err);
      return res.status(500).send('Erro ao salvar a avaliação');
    }
    res.status(200).send('Avaliação salva com sucesso!');
  });
});
app.post('/adicionarAvaliacao', async (req, res) => {
  const {
    nomeAvaliacao,
    empresa,
    dataInicio,
    dataFim,
    descricao,
    textoFinal,
    avaliados,  // Array de objetos com todos os dados dos avaliados
    competencias  // Array de objetos com todas as competências
  } = req.body;

  try {
    const [result] = await db.promise().execute(
      `INSERT INTO avaliacoes (
              nomeAvaliacao,
              empresa,
              dataInicio,
              dataFim,
              descricao,
              avaliados,
              competencias,
              textoFinal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nomeAvaliacao,
        empresa,
        dataInicio,
        dataFim,
        descricao,
        JSON.stringify(avaliados),  // Converte para JSON
        JSON.stringify(competencias), // Converte para JSON
        textoFinal
      ]
    );

    res.status(201).json({
      message: 'Avaliação salva com sucesso!',
      id: result.insertId
    });

  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});


// ----------- Rota para fazer login de usuário / avaliado -------------------------------------------

app.post('/loginusuario', (req, res) => {
  const { cpf } = req.body;

  if (!cpf) {
    return res.status(400).json({ message: 'CPF é obrigatório.' });
  }

  const cleanCpf = cpf.replace(/[^\d]/g, '');

  const query = `
    SELECT * FROM avaliacoes 
    WHERE JSON_CONTAINS(avaliados, JSON_OBJECT('cpf', ?))
  `;

  db.execute(query, [cleanCpf], (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados: ', err);
      return res.status(500).json({ message: 'Erro no servidor.' });
    }

    if (results.length > 0) {
      return res.status(200).json({
        avaliacoesEncontradas: results.map(r => ({
          id: r.id,
          nomeAvaliacao: r.nomeAvaliacao,
          empresa: r.empresa,
          dataInicio: r.dataInicio,
          dataFim: r.dataFim
        }))
      });
    } else {
      return res.status(401).json({ message: 'CPF não encontrado nas avaliações.' });
    }
  });
});


// ----------- Rota para consultar a descrição da avaliação da tabela avaliacoes usuário / avaliado -------------------------------------------

app.post('/descricaoPoridAvaliacao', (req, res) => {
  const { idAvaliacao } = req.body;

  if (!idAvaliacao) {
    return res.status(400).json({ message: 'idAvaliacao é obrigatório.' });
  }

  const query = `
    SELECT descricao FROM avaliacoes
    WHERE id = ?
`;

  db.execute(query, [idAvaliacao], (err, results) => {
    if (err) {
      console.error('Erro ao buscar descrição:', err);
      return res.status(500).json({ message: 'Erro ao buscar a descrição.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Descrição não encontrada para esse CPF.' });
    }

    return res.status(200).json({ descricao: results[0].descricao });
  });
});

// ----------- Rota para consultar as competencias da avaliação da tabela avaliacoes usuário / avaliado -------------------------------------------


// Rota para listar todas as avaliações por cpf *** ** *** 

app.post('/listarAvaliacoes', (req, res) => {
  const { cpf } = req.body;

  if (!cpf) {
    return res.status(400).json({ message: 'CPF é obrigatório.' });
  }

  const cleanCpf = cpf.replace(/[^\d]/g, '');

  const query = `
    SELECT 
      id, competencias, avaliados,
      DATE_FORMAT(dataFim, '%d/%m/%Y') AS dataFim, 
      DATE_FORMAT(dataInicio, '%d/%m/%Y') AS dataInicio, 
      descricao, empresa, nomeAvaliacao, textoFinal 
    FROM avaliacoes
    WHERE JSON_CONTAINS(avaliados, JSON_OBJECT('cpf', ?))
      AND id NOT IN (
        SELECT id_avaliacao FROM respostas_avaliacao WHERE cpf_avaliado = ?  
      )
  `; // faz a verificacao a avaliacao

  db.execute(query, [cleanCpf, cleanCpf], (err, results) => {
    if (err) {
      console.error('Erro ao consultar as avaliações: ', err);
      return res.status(500).json({ message: 'Erro ao consultar as avaliações.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Nenhuma avaliação disponível.' });
    }

    return res.status(200).json({
      avaliacoes: results.map(({ id, competencias, avaliados, dataFim, dataInicio, descricao, empresa, nomeAvaliacao, textoFinal }) => ({
        id,
        competencias,
        avaliados,
        dataFim,
        dataInicio,
        descricao,
        empresa,
        nomeAvaliacao,
        textoFinal
      }))
    });
  });
});

//Utilizado para carregar as competencias do banco, com base na avaliação salva
app.post('/competenciaPoridAvaliacao', (req, res) => {
  const { idAvaliacao } = req.body;

  if (!idAvaliacao) {
    return res.status(400).json({ message: 'idAvaliacao não encontrado' });
  }

  console.log('Buscando Avaliação...:', idAvaliacao);

  const query = `
    SELECT competencias FROM avaliacoes
    WHERE id = ?
`;

  db.execute(query, [idAvaliacao], (err, results) => {
    if (err) {
      console.error('Erro ao buscar competencias:', err);
      return res.status(500).json({ message: 'Erro ao buscar as competencias.' });
    }

    console.log('Resultados encontrados:', results);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Competências não encontradas para esse Id.' });
    }

    try {
      const competencias = JSON.parse(results[0].competencias);
      return res.status(200).json({ competencias });
    } catch (e) {
      console.error('Erro ao interpretar competências:', e);
      return res.status(500).json({ message: 'Erro ao interpretar competências.' });
    }
  });
});

//Adicione uma nova rota para salvar as respostas:
app.post('/salvarResposta', (req, res) => {
  const { idAvaliacao, cpf, competencias } = req.body;

  if (!idAvaliacao || !cpf || !Array.isArray(competencias)) {
    return res.status(400).json({ message: 'Dados incompletos.' });
  }

  const cleanCpf = cpf.replace(/[^\d]/g, '');
  const competenciasIds = competencias.map(c => c.idCompetencia);

  // Validação: verificar se todas as competências existem
  const placeholders = competenciasIds.map(() => '?').join(',');
  const checkCompetenciasQuery = `SELECT id FROM competencias WHERE id IN (${placeholders})`;

  db.execute(checkCompetenciasQuery, competenciasIds, (err, results) => {
    if (err) {
      console.error('Erro ao validar competências:', err);
      return res.status(500).json({ message: 'Erro ao validar competências.' });
    }

    const encontrados = results.map(r => r.id);
    const faltando = competenciasIds.filter(id => !encontrados.includes(id));

    if (faltando.length > 0) {
      return res.status(400).json({
        message: `As seguintes competências não existem no banco: ${faltando.join(', ')}`
      });
    }

    // Verifica se o CPF já respondeu essa avaliação
    const checkQuery = `
      SELECT COUNT(*) AS total 
      FROM respostas_avaliacao 
      WHERE id_avaliacao = ? AND cpf_avaliado = ?
    `;

    db.execute(checkQuery, [idAvaliacao, cleanCpf], (err, results) => {
      if (err) return res.status(500).json({ message: 'Erro ao verificar resposta existente.' });

      if (results[0].total > 0) {
        return res.status(400).json({ message: 'Esta avaliação já foi respondida por este CPF.' });
      }

      // Inicia a transação para salvar as respostas
      db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: 'Erro na transação inicial.' });

        const insertPromises = competencias.map(comp => {
          return new Promise((resolve, reject) => {
            const query = `
              INSERT INTO respostas_avaliacao (
                id_avaliacao,
                cpf_avaliado,
                id_competencia,
                respostas,
                observacoes,
                data_resposta
              ) VALUES (?, ?, ?, ?, ?, ?)
            `;

            const values = [
              idAvaliacao,
              cleanCpf,
              comp.idCompetencia,
              comp.valor,
              comp.observacoes || '',
              comp.dataResposta || new Date()
            ];

            db.execute(query, values, (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          });
        });

        Promise.all(insertPromises)
          .then(() => {
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Erro ao finalizar transação.' });
                });
              }
              res.status(200).json({ success: true });
            });
          })
          .catch(error => {
            console.error('Erro durante inserção:', error);
            db.rollback(() => {
              res.status(500).json({ message: 'Erro ao salvar respostas.' });
            });
          });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});