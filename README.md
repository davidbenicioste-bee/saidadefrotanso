# CMI Frota — Sistema de Registro de Ocorrências

Sistema de registro de atrasos na saída da frota para o Grupo NSÓ (AVUL / VCCL).

---

## Estrutura do projeto

```
cmi_frota/
├── app.py                  # Backend Flask (rotas e lógica)
├── requirements.txt
├── data/                   # Dados persistidos (JSON)
│   ├── usuarios.json
│   └── ocorrencias.json
├── templates/              # HTML separado por página
│   ├── publico.html
│   ├── login.html
│   └── admin.html
└── static/
    ├── css/
    │   └── base.css        # Estilos compartilhados
    └── js/
        ├── publico.js      # Lógica da página pública
        └── admin.js        # Lógica do painel admin
```

---

## Como rodar

```bash
# 1. Instalar dependências
pip install -r requirements.txt

# 2. Iniciar o servidor
python app.py
```

Acesse em: http://localhost:8000

---

## Acesso

| Página     | URL                           |
|------------|-------------------------------|
| Formulário | http://localhost:8000/        |
| Login      | http://localhost:8000/login   |
| Admin      | http://localhost:8000/admin   |

**Credenciais padrão do admin:**
- E-mail: `admin@cmi.com`
- Senha: `admin123`

> **Altere a senha padrão antes de colocar em produção!**

---

## Variáveis de ambiente (produção)

```bash
export SECRET_KEY="sua_chave_secreta_forte_aqui"
```

---

## Funcionalidades

### Página pública
- Registro de ocorrência com protocolo único (`CMI-YYYYMMDD-XXXX`)
- Confirmação visual de envio com resumo dos dados
- Consulta por número de protocolo
- Visualização das últimas 10 ocorrências

### Painel administrativo
- Dashboard com contadores (total / pendentes / respondidas)
- Filtros por protocolo, status e período de data
- Modal de visualização detalhada
- Modal de resposta com histórico
- Exportação para CSV com filtro por data
