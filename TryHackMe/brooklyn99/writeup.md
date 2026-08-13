# Brooklyn 99
> We are presented with an IP and tasks to find the user and root flags.

## Recon
Beginning with nmap scan `nmap -A -sV -T4 -p- <TARGET_IP>`, we discover that there are 3 services running - FTP, SSH, and web page,
noticing that FTP allows anonymous login (anonymous:anonymous) in this case.
```bash
# Nmap 7.99 scan initiated Thu Aug 13 15:40:31 2026 as: /usr/lib/nmap/nmap --privileged -A -sV -T4 -p- -o brooklyn_99.nmap 10.80.177.126
Nmap scan report for 10.80.177.126
Host is up (0.029s latency).
Not shown: 65532 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.3
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_-rw-r--r--    1 0        0             119 May 17  2020 note_to_jake.txt
| ftp-syst: 
|   STAT: 
| FTP server status:
|      Logged in as ftp
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      At session startup, client count was 1
|      vsFTPd 3.0.3 - secure, fast, stable
|_End of status
22/tcp open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 16:7f:2f:fe:0f:ba:98:77:7d:6d:3e:b6:25:72:c6:a3 (RSA)
|   256 2e:3b:61:59:4b:c4:29:b5:e8:58:39:6f:6f:e9:9b:ee (ECDSA)
|_  256 ab:16:2e:79:20:3c:9b:0a:01:9c:8c:44:26:01:58:04 (ED25519)
80/tcp open  http    Apache httpd 2.4.29 ((Ubuntu))
|_http-server-header: Apache/2.4.29 (Ubuntu)
|_http-title: Site doesn't have a title (text/html).
...
# Nmap done at Thu Aug 13 15:41:11 2026 -- 1 IP address (1 host up) scanned in 40.04 seconds
```
## Exploitation
### FTP
Noticing that FTP contains note for Jake, we connect to the FTP using the anonymous login and download it. The note reads
>From Amy,
>Jake please change your password. It is too weak and holt will be mad if someone hacks into the nine nine.

### SSH
Taking the hint, we run hydra using Jake's name as username:
`hydra -l jake -P /usr/share/wordlists/rockyou.txt ssh://<TARGET_IP>`
discovering Jake's password.
#### user 
Next, we log in as Jake and search for the *user.txt* file which contains the first flag
`find / -type f -name user.txt`; this command finds the file in /home/holt/ directory.
#### root 
Next, we need to read the root.txt file to which we do not have permissions.
Using command `sudo -l` we discover that Jake can use `less` to read files as root. Hence,
running `less /root/root.txt` yields the root flag.

