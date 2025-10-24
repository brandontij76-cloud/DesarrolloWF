//Agrega un evento que se ejecuta al enviar el formulario 
document.getElementById('registerForm').addEventListener('submit', async (e) => { 
    e.preventDefault();//Evita que la pagina se recargue al enviar 

    const nombre = document.getElementById('nombre').value;//Obtiene el texto del campo Nombre
    const email = document.getElementById('email').value;//Obtiene el texto del campo "email"
    const password = document.getElementById('password').value;//Obtiene el texto del campo password
    const rol = document.getElementById('rol').value;//Obtiene el valor seleccionado en rol 
    const messageElement = document.getElementById('message');//Obtiene el valor de message

    // Validaciones básicas
    //!nombre indica si nombre esta vacion 
    if (!nombre || !email || !password || !rol) {//Si falta alguno de lo campos obligatorios 
        messageElement.textContent = 'Todos los campos son obligatorios';//Muesta mensaje de error 
        messageElement.style.color = 'red';//Pone el mensaje en rojo 
        return; //Sale de la funcion y no sigue con la peticion 
    }

    //length cantidad total de caracteres de la cadena. 
    if (password.length < 6) {
        messageElement.textContent = 'La contraseña debe tener al menos 6 caracteres';
        messageElement.style.color = 'red';
        return;
    }

    try {//Intenta ejecutar la peticion al servidor 
        //fetch manda una peticion HTTP al servidor 
        //await espera a que una promise termine y da su resultado 
        const response = await fetch('/register', {
            //PUT : Actualizar datos , DELETE : borrar datos
            method: 'POST',//Enviar datos al servidor 
            headers: {
                'Content-Type': 'application/json', //Tipo de contenido, Formato JSON 
            },
            body: JSON.stringify({//stringify convierte un objeto o arreglo a una cadena de texto Formato JSON 
                nombre,
                email,
                password,
                rol
            }),
        });

        //Espera a que la respuesta se convierta de texto JSON a un objeto de Javascript y guardalo en data
        const data = await response.json();

        //Mostrar como tabla 
        console.table(data);

        if (response.ok) {//Si la respuesta fue exitosa (status 200-209)
            messageElement.textContent = 'Usuario registrado exitosamente!';
            messageElement.style.color = 'green';
            
            // Limpiar formulario
            document.getElementById('registerForm').reset();
            
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            messageElement.textContent = data.error || 'Error al registrar usuario';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        //Muestra Error y luego su objeto error (con su stack)
        console.error('Error:', error);
        messageElement.textContent = 'Error de conexión con el servidor';
        messageElement.style.color = 'red';
    }
});