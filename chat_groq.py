import os
import sys
import requests

API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

# Onde o site salva o dados.txt (ajuste se necessário)
ARQUIVO_DADOS = r"C:\Users\evera\Downloads\dados.txt"

# Pasta onde as respostas em .md serão salvas
PASTA_RESPOSTAS = r"C:\Users\evera\Downloads\dados_dev_flow"


def carregar_api_key():
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        print("Erro: variável GROQ_API_KEY não encontrada.")
        sys.exit(1)

    return api_key


def ler_dados_txt():
    """Lê o dados.txt gerado pelo site e extrai sistema, cliente, descrição e linguagens."""
    if not os.path.isfile(ARQUIVO_DADOS):
        print(f"Arquivo não encontrado: {ARQUIVO_DADOS}")
        sys.exit(1)

    with open(ARQUIVO_DADOS, "r", encoding="utf-8") as f:
        texto = f.read()

    sistema = texto.split("SISTEMA:")[1].split("\n")[0].strip()
    cliente = texto.split("Cliente:")[1].split("\n")[0].strip()
    descricao = texto.split("Descrição:")[1].split("Linguagens/tecnologias:")[0].strip()
    linguagens = texto.split("Linguagens/tecnologias:")[1].strip()

    return sistema, cliente, descricao, linguagens


def montar_prompt(sistema, cliente, descricao, linguagens):
    return f"""Estou desenvolvendo um sistema para o cliente {cliente}.

O nome do sistema é {sistema} e ele será desenvolvido utilizando {linguagens}.

A ideia principal do sistema é:
{descricao}

Analise essas informações e me ajude a organizar o desenvolvimento desse projeto. Explique o que esse sistema precisa ter, como posso estruturar ele e quais pontos devo considerar durante a criação."""


def perguntar_groq(api_key, historico):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "messages": historico,
        "temperature": 0.7,
    }

    try:
        resposta = requests.post(
            API_URL,
            headers=headers,
            json=payload,
            timeout=60
        )

        resposta.raise_for_status()

    except requests.exceptions.HTTPError as e:
        print(f"\nErro na API da Groq: {e}")
        print(resposta.text)
        return None

    except requests.exceptions.RequestException as e:
        print(f"\nErro de conexão: {e}")
        return None

    dados = resposta.json()

    return dados["choices"][0]["message"]["content"]


def sanitizar_nome(nome):
    """Remove caracteres que não podem aparecer em nome de pasta/arquivo no Windows."""
    nome = nome.strip()
    invalidos = '<>:"/\\|?*'
    for ch in invalidos:
        nome = nome.replace(ch, '')
    return nome or "sem-nome"


def salvar_md(resposta, sistema, cliente):
    cliente_seguro = sanitizar_nome(cliente)
    sistema_seguro = sanitizar_nome(sistema)

    # Uma pasta por cliente dentro de dados_dev_flow
    pasta_cliente = os.path.join(PASTA_RESPOSTAS, cliente_seguro)
    if not os.path.exists(pasta_cliente):
        os.makedirs(pasta_cliente)
        print(f"Pasta criada para o cliente: {pasta_cliente}")

    # Nome do arquivo = nome do sistema + número de ordem de criação,
    # sempre começando em -0 (ex: Sistema-0.md, Sistema-1.md, Sistema-2.md...)
    numero = 0
    while os.path.exists(os.path.join(pasta_cliente, f"{sistema_seguro}-{numero}.md")):
        numero += 1

    arquivo = os.path.join(pasta_cliente, f"{sistema_seguro}-{numero}.md")

    with open(arquivo, "w", encoding="utf-8") as f:
        f.write(f"# {sistema}\n\n")
        f.write(resposta)

    print(f"Arquivo criado: {arquivo}")


def apagar_dados_txt():
    """Remove o dados.txt depois de já ter sido processado e salvo em .md."""
    try:
        os.remove(ARQUIVO_DADOS)
        print(f"Arquivo removido: {ARQUIVO_DADOS}")
    except OSError as e:
        print(f"Não foi possível apagar o dados.txt: {e}")


def main():
    api_key = carregar_api_key()

    print("=" * 50)
    print(" Gerando prompt a partir do dados.txt")
    print("=" * 50)

    sistema, cliente, descricao, linguagens = ler_dados_txt()
    prompt = montar_prompt(sistema, cliente, descricao, linguagens)

    print("\n================ PROMPT GERADO ================")
    print(prompt)
    print("================================================")

    # Mesmas instruções de comportamento do assistente que você já tinha definido.
    historico = [
        {
            "role": "system",
            "content": "Você é um assistente útil e responde em português do Brasil."
        },
        {
            "role": "system",
            "content": "responda apenas sobre programacao se a pergunta se tratar de outro assunto corte-o, ou se for perguntas matematicas responda apenas a resposta do calculo matematico"
        },
        {
            "role": "system",
            "content": "se a pessoa perguntar como funciona o codigo explique como se fosse alguem que nao entende nada"
        },
        {
            "role": "system",
            "content": "voce deve entender exatamente as linguagem que serao usadas, separando e explicando cada codigo em qual linguagem colocar sem misturar"
        },
        {
            "role": "system",
            "content": "se alguem pedir para voce explicar como criar explique detalhadamente em topicos"
        },
        {
            "role": "system",
            "content": "voce nao manda codigos apenas ler,explique sem mandar codigos"
        },
        {
            "role": "system",
            "content": "escreva o inicio dos topicosapenas com numerossem escrever topicos"
        },
        {
            "role": "system",
            "content": "nao me fale sobre os conhecimentos que eu nessesito se pedir para explicar explique apenas o que foi perguntado sem falar sobre outras assuntos alem da explicacao"
        },
        {
            "role": "system",
            "content": "este arquivo sera mostrado em markdown sempre lembre de personalizar para deixar mais dinamico e facil de entender com paragrafos etc"
        },
        {
            "role": "system",
            "content": "lembre-se seu objetivo e entender codigos apenas fale sobre eles com excecao de calculas matematicos, se for perguntado sobre calculos matematicos mande apenas a resposta"
        },
        {
            "role": "system",
            "content": "se perguntarem sobre algum codigo apenas mande qual a linguagem exatamente assim , de forma direta"
        },
        {
            "role": "system",
            "content": "se a pessoa perguntar como funciona o codigo explique como se fosse alguem que nao entende nada, nao se esqueca disto  seria o mais impotante pois meus clientes lerao isto"
        },
        {
            "role": "system",
            "content": "voce nao pode excrever de forma alguma codigos idependente da linguagem, minha careira possivelmente estara em risco"
        },
        {
            "role": "system",
            "content": "te amo! voce e minha ia favorita"
        },
        {
            "role": "user",
            "content": prompt
        },
    ]

    print("\nGroq pensando...")
    resposta = perguntar_groq(api_key, historico)

    if resposta is None:
        print("Não foi possível obter resposta da Groq.")
        sys.exit(1)

    print("\nGroq:")
    print(resposta)

    salvar_md(resposta, sistema, cliente)
    apagar_dados_txt()


if __name__ == "__main__":
    main()