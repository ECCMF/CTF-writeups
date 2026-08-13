# Bounty Hacker
>You were boasting on and on about your elite hacker skills in the bar and a few Bounty Hunters decided they'd take you up on claims! Prove your status is more than just a few glasses at the bar. I sense bell peppers & beef in your future!

## Recon
Firstly, we scan the target with nmap:
```bash
IP=<TARGET_IP>
nmap -sV -sC -A -T4 -p- $IP -o bounty_hunter.nmap
```

This reveals that 3 ports are open - FTP, SSH and web. Quickly glancing at the web, we discover it is of no use to us. Nmap reported that FTP allows anonymous access, so we use that.

On the FTP server are 2 files, *locks.txt* and *note.txt*, downloading both, we discover who wrote the note as it is signed.

## Access
The file *locks.txt* looks quite like a list of passwords, so we try to access ssh with lin's username using hydra:
```bash
hydra -l lin -P locks.txt ssh://$IP 
```
which gives us lin's password for SSH. Logging in with the discovered password, we look around a bit, discovering the *user.txt* file in the directory we logged into.

## Privilege escalation
Next, we need to escalate privileges to read the *root.txt*.
checking with `sudo -l` we notice that lin can run `tar` as root. After some searching on the internet, we find the right command:
```bash
sudo /bin/tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh
```
which gives us the root privileges, can be verified with `id`.
Now, we just simply read the file `cat /root/root.txt` solving the challenge.
