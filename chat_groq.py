import os
import sys
import requests

API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

# Pasta onde serão salvos os arquivos
pasta = r"C:\Users\evera\Downloads\dados_dev_flow"


def carregar_api_key():
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        print("Erro: variável GROQ_API_KEY não encontrada.")
        sys.exit(1)

    return api_key

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
            timeout=30
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

def salvar_md(resposta):

    # cria a pasta se não existir
    if not os.path.exists(pasta):
        os.mkdir(pasta)
        print("Pasta criada!")

    # encontra o próximo número
    numero = 1

    while os.path.exists(os.path.join(pasta, f"{numero}.md")):
        numero += 1

    arquivo = os.path.join(pasta, f"{numero}.md")
    # cria o arquivo
    with open(arquivo, "w", encoding="utf-8") as f:
        f.write(f"# Resposta {numero}\n\n")
        f.write(resposta)
    print(f"Arquivo criado: {numero}.md")

def main():

    api_key = carregar_api_key()

    print("=" * 50)
    print(" Chat com a Groq")
    print(" Digite 'sair' para encerrar")
    print("=" * 50)

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
        }
        ,
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
        }
        ,
        {
            "role": "system",
            "content": "este arquivo sera mostrado em markdown sempre lembre de personalizar para deixar mais dinamico e facil de entender com paragrafos etc"
        }
        ,
        {
            "role": "system",
            "content": "lembre-se seu objetivo e entender codigos apenas fale sobre eles com excecao de calculas matematicos, se for perguntado sobre calculos matematicos mande apenas a resposta"
        }
        ,
        {
            "role": "system",
            "content": "se perguntarem sobre algum codigo apenas mande qual a linguagem exatamente assim , de forma direta"
        },
        {
            "role": "system",
            "content": "se a pessoa perguntar como funciona o codigo explique como se fosse alguem que nao entende nada, nao se esqueca disto  seria o mais impotante pois meus clientes lerao isto"
        }
        ,
        {
            "role": "system",
            "content": "voce nao pode excrever de forma alguma codigos idependente da linguagem, minha careira possivelmente estara em risco"
        }
        ,
        {
            "role": "system",
            "content": "te amo! voce e minha ia favorita"
        }
        ,
        {
            "role": "system",
            "content": "voce nao pode excrever de forma alguma codigos idependente da linguagem, minha careira possivelmente estara em risco"
        }
        
        ]

    while True:

        pergunta = input("\nVocê: ").strip()

        if pergunta.lower() in ("sair", "exit", "quit"):

            print("Até mais!")
            break

        if not pergunta:
            continue
        historico.append(
            {
                "role": "user",
                "content": pergunta
            }
            
        )
        print("\nGroq pensando...")
        resposta = perguntar_groq(api_key, historico)

        if resposta is None:
            historico.pop()
            continue
        print("\nGroq:")
        print(resposta)
        historico.append(
            {
                "role": "assistant",
                "content": resposta
            }
        )
        # salva automaticamente
        salvar_md(resposta)

if __name__ == "__main__":
    main()
