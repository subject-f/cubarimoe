FROM python:3.10-slim
 
RUN mkdir cubarimoe
COPY . /cubarimoe/
WORKDIR /cubarimoe

ENV APP_HOME=/cubarimoe
ENV APP_USER=dockeruser
RUN groupadd -r $APP_USER && \
    useradd -r -g $APP_USER -d $APP_HOME -s /sbin/nologin -c "Docker user" $APP_USER

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y curl git && \
    apt-get clean

RUN pip install --upgrade pip

RUN pip install -r requirements.txt
RUN pip install uvicorn gunicorn
RUN mkdir static
RUN python manage.py collectstatic --no-input


RUN chown -R $APP_USER:$APP_USER $APP_HOME
USER $APP_USER

RUN python manage.py makemigrations
RUN python manage.py migrate
RUN sed -i "s|\"o kawaii koto\"|\"$(openssl rand -base64 32)\"|" cubarimoe/settings/base.py
ENV DJANGO_SETTINGS_MODULE "cubarimoe.settings.prod"
ENV PYTHONUNBUFFERED 1

EXPOSE 8000

CMD ["gunicorn","--bind", ":8000", "cubarimoe.asgi:application", "-w", "4", "-k", "uvicorn.workers.UvicornWorker"]