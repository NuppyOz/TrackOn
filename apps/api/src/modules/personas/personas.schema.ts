import { z } from 'zod';

function textObligatorio (etiqueta: string, maximo: number) {
    return z
    .string({ error: `${etiqueta} debe ser texto`})
    .trim()
    .min(1, { error: `${etiqueta} no puede estar vacío.`})
    .max(maximo, {
        error: `${etiqueta} no debe superar ${maximo} caracteres.`
    })
}

export const createPersonaSchema = z
    .strictObject({
        firstName: textObligatorio('El primer nombre', 100),
        secondName: textObligatorio('El segundo nombre', 100)
            .nullish(),
        firstLastName: textObligatorio('El primer apellido', 100),
        secondLastName: textObligatorio('El segundo apellido', 100)
            .nullish(),
        typeDocument: textObligatorio('El tipo de documento', 30)
            .nullish(),
        numberDocument: textObligatorio('El número de documento', 50)
            .nullish(),
        telephone: textObligatorio('El teléfono', 25)
            .nullish(),
        correo: textObligatorio('El correo', 254)
            .pipe(z.email({ error: 'El correo no tiene un formato válido'}))
            .nullish(),
    })

    .superRefine((persona, contexto) => {
        const tieneTipo = persona.typeDocument != null;
        const tieneNumero = persona.numberDocument != null;

        if (tieneTipo && !tieneNumero) {
            contexto.addIssue({
                code: 'custom',
                path: ['numberDocument'],
                message: 'Debes indicar el número del documento.'
            })
        }

        if (tieneNumero && !tieneTipo) {
            contexto.addIssue({
                code: 'custom',
                path: ['typeDocument'],
                message: 'Debes indicar el tipo del docuemnto.'
            })
        }
    })


export type CreatePersonaInput = z.infer<typeof createPersonaSchema>


/* @id @default(autoincrement())
  firstName String  @db.VarChar(100)
  secondName  String?  @db.VarChar(100)
  firstLastName String @db.VarChar(100)
  secondLastName String? @db.VarChar(100)
  typeDocument String? @db.VarChar(30)
  numberDocument String? @db.VarChar(50)
  telephone String? @db.VarChar(25)
  correo String? @db.VarChar(254)

  @@map("personas")
}


*/