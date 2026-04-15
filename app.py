from flask import Flask, render_template, request, jsonify, session, redirect, send_file
from functools import wraps
import json, os, datetime, random, hashlib, csv, io

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'cmi_frota_secret_key_2024')

# ── Caminhos de dados ────────────────────────────────────────────────────────
BASE_DIR          = os.path.dirname(__file__)
DATA_DIR          = os.path.join(BASE_DIR, 'data')
ARQUIVO_USUARIOS  = os.path.join(DATA_DIR, 'usuarios.json')
ARQUIVO_OCORRENCIAS = os.path.join(DATA_DIR, 'ocorrencias.json')

os.makedirs(DATA_DIR, exist_ok=True)


# ── Utilitários de persistência ──────────────────────────────────────────────

def _ler_json(caminho: str) -> dict:
    if os.path.exists(caminho):
        try:
            with open(caminho, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}

def _salvar_json(caminho: str, dados: dict) -> None:
    with open(caminho, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

def carregar_usuarios()    -> dict: return _ler_json(ARQUIVO_USUARIOS)
def salvar_usuarios(u)     -> None: _salvar_json(ARQUIVO_USUARIOS, u)
def carregar_ocorrencias() -> dict: return _ler_json(ARQUIVO_OCORRENCIAS)
def salvar_ocorrencias(o)  -> None: _salvar_json(ARQUIVO_OCORRENCIAS, o)


# ── Helpers de negócio ───────────────────────────────────────────────────────

def hash_senha(senha: str) -> str:
    return hashlib.sha256(senha.encode()).hexdigest()

def gerar_protocolo() -> str:
    data_str = datetime.datetime.now().strftime("%Y%m%d")
    rand = random.randint(1000, 9999)
    return f"CMI-{data_str}-{rand}"

def formatar_data(data_str: str) -> str:
    """Converte YYYY-MM-DD → DD/MM/YYYY."""
    if not data_str:
        return ''
    partes = data_str.split('-')
    return f"{partes[2]}/{partes[1]}/{partes[0]}" if len(partes) == 3 else data_str


# ── Decoradores de autenticação ──────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'usuario_id' not in session:
            return jsonify({'success': False, 'message': 'Não autenticado'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'usuario_id' not in session or session.get('tipo') != 'admin':
            return jsonify({'success': False, 'message': 'Acesso negado'}), 403
        return f(*args, **kwargs)
    return decorated


# ── Rotas de página ──────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('publico.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/admin')
def admin_panel():
    if 'usuario_id' not in session or session.get('tipo') != 'admin':
        return redirect('/login')
    return render_template('admin.html', admin={'nome': session['usuario_nome']})


# ── API Pública ──────────────────────────────────────────────────────────────

@app.route('/api/registrar', methods=['POST'])
def api_registrar():
    try:
        dados = request.json or {}
        campos_obrigatorios = ['data', 'empresa', 'escala', 'garagem', 'veiculo', 'motivo']

        for campo in campos_obrigatorios:
            if not dados.get(campo):
                return jsonify({'success': False, 'message': f'Campo "{campo}" é obrigatório'})

        protocolo = gerar_protocolo()
        ocorrencias = carregar_ocorrencias()

        ocorrencias[protocolo] = {
            'protocolo':      protocolo,
            'data':           dados['data'],
            'data_formatada': formatar_data(dados['data']),
            'empresa':        dados['empresa'],
            'escala':         dados['escala'],
            'garagem':        dados['garagem'],
            'veiculo':        dados['veiculo'],
            'motivo':         dados['motivo'],
            'descricao':      dados.get('descricao', '').strip(),
            'horario':        datetime.datetime.now().strftime("%H:%M"),
            'status':         'Aguardando resposta',
            'respostas':      [],
            'timestamp':      datetime.datetime.now().isoformat(),
        }

        salvar_ocorrencias(ocorrencias)
        return jsonify({'success': True, 'protocolo': protocolo})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


@app.route('/api/consultar/<protocolo>')
def api_consultar(protocolo):
    ocorrencias = carregar_ocorrencias()
    chave = protocolo.upper()
    if chave in ocorrencias:
        return jsonify({'success': True, 'dados': ocorrencias[chave]})
    return jsonify({'success': False, 'message': 'Protocolo não encontrado'})


@app.route('/api/ultimas')
def api_ultimas():
    ocorrencias = carregar_ocorrencias()
    lista = [
        {'protocolo': p, 'data': d.get('data_formatada', ''), 'motivo': d.get('motivo', '')}
        for p, d in ocorrencias.items()
    ]
    lista.sort(key=lambda x: x['data'], reverse=True)
    return jsonify({'success': True, 'dados': lista[:10]})


# ── API de Autenticação ──────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def api_login():
    dados = request.json or {}
    email = dados.get('email', '').strip()
    senha = dados.get('senha', '')

    if not email or not senha:
        return jsonify({'success': False, 'message': 'Preencha todos os campos'})

    usuarios = carregar_usuarios()
    usuario = usuarios.get(email)

    if usuario and usuario.get('senha') == hash_senha(senha) and usuario.get('tipo') == 'admin':
        session['usuario_id']   = email
        session['usuario_nome'] = usuario['nome']
        session['tipo']         = 'admin'
        return jsonify({'success': True, 'redirect': '/admin'})

    return jsonify({'success': False, 'message': 'E-mail ou senha incorretos'})


@app.route('/api/logout')
def api_logout():
    session.clear()
    return jsonify({'success': True})


# ── API Administrativa ───────────────────────────────────────────────────────

@app.route('/api/admin/ocorrencias')
@admin_required
def admin_ocorrencias():
    ocorrencias = carregar_ocorrencias()
    lista = [
        {
            'protocolo': p,
            'data':       d.get('data_formatada', ''),
            'data_iso':   d.get('data', ''),
            'empresa':    d.get('empresa', ''),
            'escala':     d.get('escala', ''),
            'garagem':    d.get('garagem', ''),
            'veiculo':    d.get('veiculo', ''),
            'motivo':     d.get('motivo', ''),
            'descricao':  d.get('descricao', ''),
            'status':     d.get('status', 'Aguardando resposta'),
            'horario':    d.get('horario', ''),
            'respostas':  d.get('respostas', []),
        }
        for p, d in ocorrencias.items()
    ]
    lista.sort(key=lambda x: x['data_iso'], reverse=True)
    return jsonify({'success': True, 'dados': lista})


@app.route('/api/admin/responder', methods=['POST'])
@admin_required
def admin_responder():
    try:
        dados     = request.json or {}
        protocolo = dados.get('protocolo', '').upper()
        resposta  = dados.get('resposta', '').strip()
        status    = dados.get('status', 'Respondida')

        if not protocolo or not resposta:
            return jsonify({'success': False, 'message': 'Protocolo e resposta são obrigatórios'})

        ocorrencias = carregar_ocorrencias()
        if protocolo not in ocorrencias:
            return jsonify({'success': False, 'message': 'Protocolo não encontrado'})

        ocorrencias[protocolo].setdefault('respostas', []).append({
            'data':           datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
            'mensagem':       resposta,
            'respondido_por': session['usuario_nome'],
        })
        ocorrencias[protocolo]['status'] = status
        salvar_ocorrencias(ocorrencias)

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


@app.route('/api/exportar-csv')
@admin_required
def exportar_csv():
    ocorrencias  = carregar_ocorrencias()
    data_inicio  = request.args.get('data_inicio', '')
    data_fim     = request.args.get('data_fim', '')

    def dentro_do_periodo(data_iso):
        if data_inicio and data_fim:
            return data_inicio <= data_iso <= data_fim
        return True

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(['Protocolo', 'Data', 'Empresa', 'Operador', 'Garagem',
                     'Veículo', 'Classificação', 'Descrição', 'Status',
                     'Horário Registro', 'Respostas'])

    for proto, d in ocorrencias.items():
        if not dentro_do_periodo(d.get('data', '')):
            continue
        respostas_txt = ' | '.join(
            f"{r['data']} - {r['respondido_por']}: {r['mensagem']}"
            for r in d.get('respostas', [])
        )
        writer.writerow([
            proto, d.get('data_formatada', ''), d.get('empresa', ''),
            d.get('escala', ''), d.get('garagem', ''), d.get('veiculo', ''),
            d.get('motivo', ''), d.get('descricao', ''), d.get('status', ''),
            d.get('horario', ''), respostas_txt,
        ])

    output.seek(0)
    nome = f"ocorrencias_cmi_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=nome,
    )


# ── Inicialização ────────────────────────────────────────────────────────────

def _criar_admin_padrao():
    """Garante que o usuário admin padrão exista no primeiro boot."""
    usuarios = carregar_usuarios()
    email_padrao = 'admin@cmi.com'
    if email_padrao not in usuarios:
        usuarios[email_padrao] = {
            'nome':          'Administrador',
            'email':         email_padrao,
            'senha':         hash_senha('admin123'),
            'tipo':          'admin',
            'data_cadastro': datetime.datetime.now().isoformat(),
        }
        salvar_usuarios(usuarios)


if __name__ == '__main__':
    _criar_admin_padrao()
    
    # Pega a porta definida pelo Render ou usa 8000 como fallback
    porta = int(os.environ.get('PORT', 8000))
    
    print("=" * 55)
    print("  CMI FROTA — Sistema de Gestão de Ocorrências")
    print("=" * 55)
    print(f"  Rodando na porta: {porta}")
    print("=" * 55)
    
    app.run(debug=False, host='0.0.0.0', port=porta)
