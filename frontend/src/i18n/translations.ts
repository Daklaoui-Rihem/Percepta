export type Lang = 'fr' | 'en' | 'ar';

const translations = {

  // ── Auth page ─────────────────────────────────────────────────
  welcome:             { fr: 'Bienvenue',                              en: 'Welcome',                          ar: 'مرحباً'                              },
  email:               { fr: 'Email',                                  en: 'Email',                            ar: 'البريد الإلكتروني'                   },
  emailPlaceholder:    { fr: 'votre@email.com',                        en: 'your@email.com',                   ar: 'بريدك@الإلكتروني.com'                },
  password:            { fr: 'Mot de passe',                           en: 'Password',                         ar: 'كلمة المرور'                         },
  passwordPlaceholder: { fr: '••••••••',                               en: '••••••••',                         ar: '••••••••'                             },
  forgotPassword:      { fr: 'Mot de passe oublié ?',                  en: 'Forgot password?',                 ar: 'نسيت كلمة المرور؟'                   },
  loginButton:         { fr: 'Se connecter',                           en: 'Sign in',                          ar: 'تسجيل الدخول'                        },
  loggingIn:           { fr: 'Connexion...',                           en: 'Signing in...',                    ar: 'جارٍ الدخول...'                      },
  fillAllFields:       { fr: 'Veuillez remplir tous les champs',       en: 'Please fill in all fields',        ar: 'يرجى ملء جميع الحقول'                },
  invalidCredentials:  { fr: 'Identifiants invalides',                 en: 'Invalid credentials',              ar: 'بيانات الدخول غير صحيحة'             },
  copyright:           { fr: '© 2026 IFBW AI Platform. Tous droits réservés.', en: '© 2026 IFBW AI Platform. All rights reserved.', ar: '© 2026 IFBW AI Platform. جميع الحقوق محفوظة.' },

  // ── Navigation ────────────────────────────────────────────────
  home:                { fr: 'Accueil',                                en: 'Home',                             ar: 'الرئيسية'                            },
  transcriptions:      { fr: 'Transcriptions',                        en: 'Transcriptions',                   ar: 'النصوص'                              },
  videoAnalysis:       { fr: 'Analyse Vidéo',                         en: 'Video Analysis',                   ar: 'تحليل الفيديو'                       },
  reports:             { fr: 'Rapports',                              en: 'Reports',                          ar: 'التقارير'                            },
  profile:             { fr: 'Profil',                                en: 'Profile',                          ar: 'الملف الشخصي'                        },
  logout:              { fr: 'Déconnexion',                           en: 'Logout',                           ar: 'تسجيل الخروج'                        },
  settings:            { fr: 'Paramètres',                            en: 'Settings',                         ar: 'الإعدادات'                           },
  myProfileMenu:       { fr: 'Mon Profil',                            en: 'My Profile',                       ar: 'ملفي الشخصي'                         },
  clientUser:          { fr: 'Utilisateur',                           en: 'Client User',                      ar: 'المستخدم'                            },

  // ── Client Dashboard ──────────────────────────────────────────
  dashboard:           { fr: 'Tableau de bord',                       en: 'Dashboard',                        ar: 'لوحة التحكم'                         },
  newTranscription:    { fr: 'Nouvelle Transcription',                en: 'New Transcription',                ar: 'نص جديد'                             },
  analyzeVideo:        { fr: 'Analyser une Vidéo',                    en: 'Analyze a Video',                  ar: 'تحليل فيديو'                         },
  totalTranscriptions: { fr: 'Total Transcriptions',                  en: 'Total Transcriptions',             ar: 'إجمالي النصوص'                       },
  videosAnalyzed:      { fr: 'Vidéos Analysées',                      en: 'Videos Analyzed',                  ar: 'الفيديوهات المحللة'                  },
  reportsGenerated:    { fr: 'Rapports Générés',                      en: 'Reports Generated',                ar: 'التقارير المولّدة'                    },
  activeProjects:      { fr: 'Projets Actifs',                        en: 'Active Projects',                  ar: 'المشاريع النشطة'                     },
  recentAnalyses:      { fr: 'Analyses Récentes',                     en: 'Recent Analyses',                  ar: 'التحليلات الأخيرة'                   },
  name:                { fr: 'Nom',                                   en: 'Name',                             ar: 'الاسم'                               },
  type:                { fr: 'Type',                                  en: 'Type',                             ar: 'النوع'                               },
  date:                { fr: 'Date',                                  en: 'Date',                             ar: 'التاريخ'                             },
  status:              { fr: 'Statut',                                en: 'Status',                           ar: 'الحالة'                              },
  completed:           { fr: 'Complété',                              en: 'Completed',                        ar: 'مكتمل'                               },
  inProgress:          { fr: 'En cours',                              en: 'In Progress',                      ar: 'قيد التنفيذ'                         },
  pending:             { fr: 'En attente',                            en: 'Pending',                          ar: 'معلّق'                               },
  transcription:       { fr: 'Transcription',                         en: 'Transcription',                   ar: 'نص'                                  },
  videoAnalysisType:   { fr: 'Analyse Vidéo',                         en: 'Video Analysis',                   ar: 'تحليل فيديو'                         },

  // ── Profile page ─────────────────────────────────────────────
  myProfile:           { fr: 'Mon Profil',                            en: 'My Profile',                       ar: 'ملفي الشخصي'                         },
  personalInfo:        { fr: 'Informations Personnelles',             en: 'Personal Information',             ar: 'المعلومات الشخصية'                   },
  firstName:           { fr: 'Prénom',                                en: 'First Name',                       ar: 'الاسم الأول'                         },
  lastName:            { fr: 'Nom',                                   en: 'Last Name',                        ar: 'اسم العائلة'                         },
  emailAddress:        { fr: 'Adresse Email',                         en: 'Email Address',                    ar: 'عنوان البريد الإلكتروني'             },
  changePassword:      { fr: 'Changer le mot de passe',               en: 'Change Password',                  ar: 'تغيير كلمة المرور'                   },
  saveChanges:         { fr: 'Sauvegarder',                           en: 'Save Changes',                     ar: 'حفظ التغييرات'                       },
  accountInfo:         { fr: 'Informations du Compte',                en: 'Account Information',              ar: 'معلومات الحساب'                      },
  accountCreated:      { fr: 'Compte créé le',                        en: 'Account Created',                  ar: 'تاريخ إنشاء الحساب'                  },
  lastAccess:          { fr: 'Dernier accès',                         en: 'Last Access',                      ar: 'آخر دخول'                            },
  accountStatus:       { fr: 'Statut du compte',                      en: 'Account Status',                   ar: 'حالة الحساب'                         },
  active:              { fr: 'Actif',                                 en: 'Active',                           ar: 'نشط'                                 },

} as const;

export default translations;