import os

arquivo = r"C:\Users\evera\Downloads\dados.txt"

if os.path.isfile(arquivo):

    with open(arquivo, "r", encoding="utf-8") as f:
        texto = f.read()


    sistema = texto.split("SISTEMA:")[1].split("\n")[0].strip()

    cliente = texto.split("Cliente:")[1].split("\n")[0].strip()

    descricao = texto.split("Descrição:")[1].split("Linguagens/tecnologias:")[0].strip()

    linguagens = texto.split("Linguagens/tecnologias:")[1].strip()


    prompt = f"""
Estou desenvolvendo um sistema para o cliente {cliente}.

O nome do sistema é {sistema} e ele será desenvolvido utilizando {linguagens}.

A ideia principal do sistema é:
{descricao}

Analise essas informações e me ajude a organizar o desenvolvimento desse projeto. Explique o que esse sistema precisa ter, como posso estruturar ele e quais pontos devo considerar durante a criação.
"""


    print("================ PROMPT GERADO ================")
    print(prompt)
    print("================================================")


else:
    print("Arquivo não encontrado!")