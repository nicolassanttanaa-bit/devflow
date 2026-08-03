#!/usr/bin/env python3
"""
Chat no terminal usando a API da Groq.

Como usar:
1. Instale a dependência:
   pip install requests

2. Defina sua chave de API da Groq como variável de ambiente:
   export GROQ_API_KEY="sua_chave_aqui"      (Linux/Mac)
   set GROQ_API_KEY="sua_chave_aqui"         (Windows CMD)
   $env:GROQ_API_KEY="sua_chave_aqui"        (Windows PowerShell)

   Você pode gerar uma chave gratuita em: https://console.groq.com/keys

3. Rode o script:
   python chat_groq.py
"""

import os
import sys
import requests

API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"  # pode trocar por outro modelo disponível na Groq


def carregar_api_key() -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("Erro: variável de ambiente GROQ_API_KEY não encontrada.")
        print("Defina com: export GROQ_API_KEY='sua_chave_aqui'")
        sys.exit(1)
    return api_key


def perguntar_groq(api_key: str, historico: list) -> str:
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
        resposta = requests.post(API_URL, headers=headers, json=payload, timeout=30)
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


def main():
    api_key = carregar_api_key()

    print("=" * 50)
    print("  Chat com a Groq no terminal")
    print("  Digite 'sair' para encerrar")
    print("=" * 50)

    historico = [
        {"role": "system", "content": "Você é um assistente útil e responde em português do Brasil."}
    ]

    while True:
        pergunta = input("\nVocê: ").strip()

        if pergunta.lower() in ("sair", "exit", "quit"):
            print("Até mais!")
            break

        if not pergunta:
            continue

        historico.append({"role": "user", "content": pergunta})

        print("Groq: ", end="", flush=True)
        resposta = perguntar_groq(api_key, historico)

        if resposta is None:
            historico.pop()  # remove a pergunta que falhou
            continue

        print(resposta)
        historico.append({"role": "assistant", "content": resposta})


if __name__ == "__main__":
    main()
