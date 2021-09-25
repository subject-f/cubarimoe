# Cubari.moe
An image proxy powered by the Cubari reader.

Testing Supported By<br/>
<img width="160" src="http://foundation.zurb.com/sites/docs/assets/img/logos/browser-stack.svg" alt="BrowserStack"/>

## Prerequisites 
- git
- python 3.6.5+
- pip
- virtualenv

## Install
1. Create a venv for cubarimoe in your home directory.
```
virtualenv ~/cubarimoe
```

2. Clone cubarimoe's source code into the venv.
```
git clone https://github.com/appu1232/cubarimoe ~/cubarimoe/app
```

3. Activate the venv.
```
cd ~/cubarimoe/app && source ../bin/activate
```

4. Install cubarimoe's dependencies.
```
pip3 install -r requirements.txt
```

5. Change the value of the `SECRET_KEY` variable to a randomly generated string.
```
sed -i "s|\"o kawaii koto\"|\"$(openssl rand -base64 32)\"|" cubarimoe/settings/base.py
```

6. Generate the default assets for cubarimoe.
```
python3 init.py
```

7. Create an admin user for cubarimoe.
```
python3 manage.py createsuperuser
```

## Start the server
-  `python3 manage.py runserver` - keep this console active

Now the site should be accessible on localhost:8000

## Other info
Relevant URLs (as of now): 

- `/` - home page
- `/admin` - admin view (login with created user above)
- `/admin_home` - admin endpoint for clearing the site's cache
